import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';

export const OHLCV_UPDATE_EVENT = 'ohlcv.update';

// Helper: parse timeframe string to ms (e.g. '1m' -> 60000)
function parseTimeframe(timeframe: string): number {
  const m = timeframe.match(/^(\d+)([smhdwMy])$/);
  if (!m) throw new Error('Invalid timeframe: ' + timeframe);
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    case 'w':
      return n * 7 * 24 * 60 * 60 * 1000;
    case 'M':
      return n * 30 * 24 * 60 * 60 * 1000;
    case 'y':
      return n * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid timeframe unit: ' + m[2]);
  }
}

@Injectable()
export class WsOhlcvService {
  private readonly logger = new Logger(WsOhlcvService.name);
  // roomKey -> { trades, subscribers: Map<clientId, timeframe>, lastEmitted: Map<clientId:timeframe, lastClosedTs> }
  private rooms = new Map<
    string,
    {
      trades: any[];
      subscribers: Map<string, string>;
      lastEmitted: Map<string, number>;
    }
  >();
  private watcherTasks = new Map<string, Promise<void>>(); // roomKey -> watcher
  private readonly eventEmitter: EventEmitter2;
  private readonly exchangeInstanceService: ExchangeInstanceService;

  constructor(eventEmitter: EventEmitter2, exchangeInstanceService: ExchangeInstanceService) {
    this.eventEmitter = eventEmitter;
    this.exchangeInstanceService = exchangeInstanceService;
  }

  private getRoomKey(exchangeId: string, symbol: string): string {
    return `ohlcv:${exchangeId}:${symbol}`;
  }

  async watchOhlcv(
    clientId: string,
    exchangeId: string,
    symbol: string,
    timeframe: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey(exchangeId, symbol);
    if (!this.rooms.has(room)) {
      this.rooms.set(room, {
        trades: [],
        subscribers: new Map(),
        lastEmitted: new Map()
      });
    }
    const r = this.rooms.get(room)!;
    r.subscribers.set(clientId, timeframe);
    if (!this.watcherTasks.has(room)) {
      const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchangeWrapper) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOhlcvWatcher(exchangeId, symbol, room, exchangeWrapper));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchOhlcv(clientId: string, exchangeId: string, symbol: string, _timeframe: string): Promise<string> {
    const room = this.getRoomKey(exchangeId, symbol);
    const r = this.rooms.get(room);
    if (r) {
      r.subscribers.delete(clientId);
      // Clean up lastEmitted for this client
      for (const key of Array.from(r.lastEmitted.keys())) {
        if (key.startsWith(clientId + ':')) r.lastEmitted.delete(key);
      }
      if (r.subscribers.size === 0) {
        this.rooms.delete(room);
        this.watcherTasks.delete(room);
      }
    }
    return room;
  }

  // Efficient deduplication: only append trades with new id/timestamp
  private appendNewTrades(history: any[], newTrades: any[]): void {
    if (!newTrades.length) return;
    const last = history.length ? history[history.length - 1] : null;
    for (const t of newTrades) {
      if (!last || (t.id && t.id !== last.id) || (!t.id && t.timestamp > last.timestamp)) {
        history.push(t);
      }
    }
  }

  // Prune trades to only keep enough for the largest requested timeframe
  private pruneHistory(trades: any[], maxTimeframeMs: number): void {
    const minTs = Date.now() - maxTimeframeMs * 100; // 100 candles worth
    while (trades.length && trades[0].timestamp < minTs) {
      trades.shift();
    }
  }

  private groupByTimeframe(subscribers: Map<string, string>): Map<string, string[]> {
    const tfMap = new Map<string, string[]>();
    for (const [clientId, tf] of subscribers.entries()) {
      if (!tfMap.has(tf)) tfMap.set(tf, []);
      tfMap.get(tf)!.push(clientId);
    }
    return tfMap;
  }

  private async startOhlcvWatcher(
    exchangeId: string,
    symbol: string,
    room: string,
    exchangeWrapper: any
  ): Promise<void> {
    this.logger.log(`Starting OHLCV watcher for room ${room}`);
    const r = this.rooms.get(room)!;

    const interval = setInterval(async () => {
      if (!this.rooms.has(room) || r.subscribers.size === 0) {
        clearInterval(interval);
        this.logger.log(`Stopped OHLCV watcher for room ${room}`);
        this.watcherTasks.delete(room);

        // Cleanup exchange watcher if supported
        if (exchangeWrapper.exchange.has['unWatchTrades']) {
          try {
            await exchangeWrapper.exchange.unWatchTrades(symbol);
          } catch (err) {
            this.logger.error(`Error unwatching trades for ${room}: ${err.message}`);
          }
        }

        this.rooms.delete(room);
        return;
      }

      try {
        const trades: any[] = await exchangeWrapper.exchange.watchTrades(symbol);

        this.appendNewTrades(r.trades, trades);

        // Find largest requested timeframe (in ms)
        const tfMap = this.groupByTimeframe(r.subscribers);
        const timeframes = Array.from(tfMap.keys());
        if (!timeframes.length) return;

        const tfMsArr = timeframes.map(parseTimeframe);
        const maxTfMs = Math.max(...tfMsArr);
        this.pruneHistory(r.trades, maxTfMs);

        // For each unique timeframe, build OHLCVC once, emit to all users requesting it
        for (const [tf, clientIds] of tfMap.entries()) {
          let ohlcvc: any[] = [];
          try {
            ohlcvc = exchangeWrapper.exchange.buildOHLCVC(r.trades, tf);
          } catch (e) {
            this.logger.error(`buildOHLCVC failed for ${room} tf=${tf}: ${e.message}`);
            continue;
          }

          if (!ohlcvc.length) continue;

          // All but last candle are closed
          for (const clientId of clientIds) {
            const mapKey = `${clientId}:${tf}`;
            let lastEmitted = r.lastEmitted.get(mapKey) || 0;

            for (let i = 0; i < ohlcvc.length - 1; i++) {
              const candle = ohlcvc[i];
              const ts = candle[0];
              if (ts > lastEmitted) {
                this.eventEmitter.emit(OHLCV_UPDATE_EVENT, {
                  room: `${room}:${clientId}:${tf}`,
                  data: { candle, closed: true }
                });
                lastEmitted = ts;
              }
            }
            r.lastEmitted.set(mapKey, lastEmitted);

            // Always emit the in-progress candle
            const lastCandle = ohlcvc[ohlcvc.length - 1];
            this.eventEmitter.emit(OHLCV_UPDATE_EVENT, {
              room: `${room}:${clientId}:${tf}`,
              data: { candle: lastCandle, closed: false }
            });
          }
        }
      } catch (err) {
        this.logger.error(`Error watching trades for ${room}: ${err.message}`);
      }
    }, 500);

    // Store the interval ID for cleanup
    this.watcherTasks.set(room, Promise.resolve());
  }
}
