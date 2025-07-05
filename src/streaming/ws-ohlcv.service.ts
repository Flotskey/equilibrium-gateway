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
  private readonly eventEmitter: EventEmitter2;
  private readonly exchangeInstanceService: ExchangeInstanceService;

  // Configurable frequency in ms (default 1s, min 1s)
  private readonly minFrequencyMs = 1000;
  private frequencyMs = 1000;

  constructor(eventEmitter: EventEmitter2, exchangeInstanceService: ExchangeInstanceService) {
    this.eventEmitter = eventEmitter;
    this.exchangeInstanceService = exchangeInstanceService;
  }

  setFrequencyMs(ms: number) {
    this.frequencyMs = Math.max(this.minFrequencyMs, ms);
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
    // Track last sent candle timestamp per user/timeframe
    const lastCandleTimestamps = new Map<string, number>(); // userKey:timeframe -> timestamp
    const lastEmitTimes = new Map<string, number>(); // userKey:timeframe -> last emit time (ms)
    try {
      while (this.subscribers.has(room)) {
        const trades = await exchangeWrapper.exchange.watchTrades(symbol);
        const clients = this.subscribers.get(room);
        if (!clients) break; // Room was deleted, exit loop
        const now = Date.now();
        for (const clientId of clients) {
          const userKey = this.getUserKey(clientId, exchangeId, symbol);
          const timeframe = this.userTimeframes.get(userKey);
          if (timeframe) {
            const ohlcvc = exchangeWrapper.exchange.buildOHLCVC(trades, timeframe);
            if (ohlcvc.length > 0) {
              const lastCandle = ohlcvc[ohlcvc.length - 1];
              const lastTimestamp = lastCandle[0]; // CCXT: [timestamp, open, high, low, close, volume, ...]
              const mapKey = `${userKey}:${timeframe}`;
              const lastEmit = lastEmitTimes.get(mapKey) || 0;
              if (lastCandleTimestamps.get(mapKey) !== lastTimestamp && now - lastEmit >= this.frequencyMs) {
                this.eventEmitter.emit(OHLCV_UPDATE_EVENT, { room: `${room}:${clientId}:${timeframe}`, data: ohlcvc });
                lastCandleTimestamps.set(mapKey, lastTimestamp);
                lastEmitTimes.set(mapKey, now);
              }
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
    }
  }
}
