import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Ticker, Tickers } from 'ccxt';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';
import { TICKER_UPDATE_EVENT, TICKERS_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class WsTickerService {
  private readonly logger = new Logger(WsTickerService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(type: string, exchangeId: string, symbols: string[]): string {
    return `${type}:${exchangeId}:${symbols.sort().join(',')}`;
  }

  async watchTicker(clientId: string, exchangeId: string, symbol: string): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('ticker', exchangeId, [symbol]);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchange) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startTickerWatcher(exchangeId, [symbol], room));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchTicker(clientId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('ticker', exchangeId, [symbol]);
    this.removeSubscriber(room, clientId);
    return room;
  }

  async watchTickers(
    clientId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('tickers', exchangeId, symbols);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchange) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startTickerWatcher(exchangeId, symbols, room));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchTickers(clientId: string, exchangeId: string, symbols: string[]): Promise<string> {
    const room = this.getRoomKey('tickers', exchangeId, symbols);
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

  private async startTickerWatcher(exchangeId: string, symbols: string[], room: string): Promise<void> {
    this.logger.log(`Starting ticker watcher for room ${room}`);
    const exchangeWrapper = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
    try {
      while (this.subscribers.has(room)) {
        let tickers: Tickers | Ticker;
        if (symbols.length === 1) {
          tickers = await exchangeWrapper.exchange.watchTicker(symbols[0]);
          this.eventEmitter.emit(TICKER_UPDATE_EVENT, { room, data: tickers });
        } else {
          tickers = await exchangeWrapper.exchange.watchTickers(symbols);
          this.eventEmitter.emit(TICKERS_UPDATE_EVENT, { room, data: tickers });
        }
      }
    } catch (err) {
      this.logger.error(`Error in ticker watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      this.logger.log(`Stopped ticker watcher for room ${room}`);
      this.watcherTasks.delete(room);
      if (exchangeWrapper.exchange.has['unWatchTickers']) {
        await exchangeWrapper.exchange.unWatchTickers(symbols);
      }
    }
  }
}
