import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';

export const OHLCV_UPDATE_EVENT = 'ohlcv.update';

@Injectable()
export class WsOhlcvService {
  private readonly logger = new Logger(WsOhlcvService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(exchangeId: string, symbol: string, timeframe: string): string {
    return `ohlcv:${exchangeId}:${symbol}:${timeframe}`;
  }

  async watchOhlcv(
    clientId: string,
    exchangeId: string,
    symbol: string,
    timeframe: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey(exchangeId, symbol, timeframe);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchangeWrapper) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOhlcvWatcher(exchangeId, symbol, timeframe, room));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchOhlcv(clientId: string, exchangeId: string, symbol: string, timeframe: string): Promise<string> {
    const room = this.getRoomKey(exchangeId, symbol, timeframe);
    this.removeSubscriber(room, clientId);
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

  private async startOhlcvWatcher(exchangeId: string, symbol: string, timeframe: string, room: string): Promise<void> {
    this.logger.log(`Starting OHLCV watcher for room ${room}`);
    const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
    if (!exchangeWrapper) {
      this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
      this.watcherTasks.delete(room);
      return;
    }
    try {
      while (this.subscribers.has(room)) {
        const trades = await exchangeWrapper.exchange.watchTrades(symbol);
        const ohlcvc = exchangeWrapper.exchange.buildOHLCVC(trades, timeframe);
        this.eventEmitter.emit(OHLCV_UPDATE_EVENT, { room, data: ohlcvc });
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
