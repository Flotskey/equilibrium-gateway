import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';

export const OHLCV_UPDATE_EVENT = 'ohlcv.update';

@Injectable()
export class WsOhlcvService {
  private readonly logger = new Logger(WsOhlcvService.name);
  private subscribers = new Map<string, Set<string>>(); // roomKey -> Set<clientId>
  private watcherTasks = new Map<string, Promise<void>>(); // roomKey -> watcher
  private userTimeframes = new Map<string, string>(); // userKey -> timeframe
  private tradeHistory = new Map<string, any[]>(); // roomKey -> trades[]
  private readonly eventEmitter: EventEmitter2;
  private readonly exchangeInstanceService: ExchangeInstanceService;

  constructor(eventEmitter: EventEmitter2, exchangeInstanceService: ExchangeInstanceService) {
    this.eventEmitter = eventEmitter;
    this.exchangeInstanceService = exchangeInstanceService;
  }

  // Room key is exchangeId:symbol (not timeframe)
  private getRoomKey(exchangeId: string, symbol: string): string {
    return `ohlcv:${exchangeId}:${symbol}`;
  }

  // User key is clientId:exchangeId:symbol
  private getUserKey(clientId: string, exchangeId: string, symbol: string): string {
    return `${clientId}:${exchangeId}:${symbol}`;
  }

  async watchOhlcv(
    clientId: string,
    exchangeId: string,
    symbol: string,
    timeframe: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey(exchangeId, symbol);
    const userKey = this.getUserKey(clientId, exchangeId, symbol);
    this.addSubscriber(room, clientId);
    this.userTimeframes.set(userKey, timeframe); // Always update to latest timeframe
    if (!this.watcherTasks.has(room)) {
      const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchangeWrapper) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOhlcvWatcher(exchangeId, symbol, room));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchOhlcv(clientId: string, exchangeId: string, symbol: string, _timeframe: string): Promise<string> {
    const room = this.getRoomKey(exchangeId, symbol);
    const userKey = this.getUserKey(clientId, exchangeId, symbol);
    this.removeSubscriber(room, clientId);
    this.userTimeframes.delete(userKey);
    return room;
  }

  private addSubscriber(room: string, clientId: string) {
    if (!this.subscribers.has(room)) this.subscribers.set(room, new Set());
    this.subscribers.get(room)!.add(clientId);
  }

  private removeSubscriber(room: string, clientId: string) {
    if (!this.subscribers.has(room)) return;
    const set = this.subscribers.get(room)!;
    set.delete(clientId);
    if (set.size === 0) {
      this.subscribers.delete(room);
      this.watcherTasks.delete(room);
    }
  }

  private async startOhlcvWatcher(exchangeId: string, symbol: string, room: string): Promise<void> {
    this.logger.log(`Starting OHLCV watcher for room ${room}`);
    const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
    if (!exchangeWrapper) {
      this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
      this.watcherTasks.delete(room);
      return;
    }
    // Track last closed candle timestamp per user/timeframe
    const lastClosedTimestamps = new Map<string, number>(); // userKey:timeframe -> timestamp
    // Trade history for this room (exchangeId:symbol)
    const historyKey = room; // ohlcv:exchangeId:symbol
    if (!this.tradeHistory.has(historyKey)) this.tradeHistory.set(historyKey, []);
    try {
      while (this.subscribers.has(room)) {
        const trades = await exchangeWrapper.exchange.watchTrades(symbol);
        // Merge new trades into history, avoiding duplicates
        const history = this.tradeHistory.get(historyKey)!;
        let lastTradeId = history.length ? history[history.length - 1].id : null;
        // Only add trades that are new (by id or timestamp)
        let newTrades = trades;
        if (lastTradeId) {
          const lastIndex = trades.findIndex((t: any) => t.id === lastTradeId);
          if (lastIndex >= 0) {
            newTrades = trades.slice(lastIndex + 1);
          }
        }
        // Fallback: if id is not available, dedupe by timestamp
        if (!lastTradeId && history.length) {
          const lastTs = history[history.length - 1].timestamp;
          newTrades = trades.filter((t: any) => t.timestamp > lastTs);
        }
        if (newTrades.length) {
          history.push(...newTrades);
        }
        // Prune old trades (keep last 2 hours for safety)
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        while (history.length && history[0].timestamp < twoHoursAgo) {
          history.shift();
        }
        // Now use the full history for OHLCVC
        const clients = this.subscribers.get(room);
        if (!clients) break; // Room was deleted, exit loop
        for (const clientId of clients) {
          const userKey = this.getUserKey(clientId, exchangeId, symbol);
          const timeframe = this.userTimeframes.get(userKey);
          if (timeframe) {
            const ohlcvc = exchangeWrapper.exchange.buildOHLCVC(history, timeframe);
            if (ohlcvc.length > 0) {
              const lastCandle = ohlcvc[ohlcvc.length - 1];
              const prevCandle = ohlcvc.length > 1 ? ohlcvc[ohlcvc.length - 2] : null;
              const prevTimestamp = prevCandle ? prevCandle[0] : null;
              const mapKey = `${userKey}:${timeframe}`;
              // Emit closed candle if a new one appeared
              if (prevCandle && lastClosedTimestamps.get(mapKey) !== prevTimestamp) {
                this.eventEmitter.emit(OHLCV_UPDATE_EVENT, {
                  room: `${room}:${clientId}:${timeframe}`,
                  data: { candle: prevCandle, closed: true }
                });
                lastClosedTimestamps.set(mapKey, prevTimestamp);
              }
              // Always emit the in-progress candle (last one)
              this.eventEmitter.emit(OHLCV_UPDATE_EVENT, {
                room: `${room}:${clientId}:${timeframe}`,
                data: { candle: lastCandle, closed: false }
              });
            }
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error in OHLCV watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      this.logger.log(`Stopped OHLCV watcher for room ${room}`);
      this.watcherTasks.delete(room);
      if (exchangeWrapper.exchange.has['unWatchTrades']) {
        await exchangeWrapper.exchange.unWatchTrades(symbol);
      }
      // Clean up trade history for this room
      this.tradeHistory.delete(historyKey);
    }
  }
}
