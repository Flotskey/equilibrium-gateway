import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderBook, OrderBooks } from 'ccxt';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';
import { delay } from '../utils/delay';
import { ORDERBOOK_UPDATE_EVENT, ORDERBOOKS_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class WsOrderbookService {
  private readonly logger = new Logger(WsOrderbookService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(type: string, exchangeId: string, symbols: string[]): string {
    return `${type}:${exchangeId}:${symbols.sort().join(',')}`;
  }

  async watchOrderBook(
    clientId: string,
    exchangeId: string,
    symbol: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('orderbook', exchangeId, [symbol]);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchange) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOrderbookWatcher(exchangeId, [symbol], room));
      return { room, started: true };
    }
    return { room, started: true };
  }
  async unWatchOrderBook(clientId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', exchangeId, [symbol]);
    this.removeSubscriber(room, clientId);
    return room;
  }

  async watchOrderBookForSymbols(
    clientId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('orderbookForSymbols', exchangeId, symbols);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
      if (!exchange) {
        this.logger.warn(`No public exchange instance found for exchange ${exchangeId}.`);
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOrderbookWatcher(exchangeId, symbols, room));
      return { room, started: true };
    }
    return { room, started: true };
  }
  async unWatchOrderBookForSymbols(clientId: string, exchangeId: string, symbols: string[]): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', exchangeId, symbols);
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

  private async startOrderbookWatcher(exchangeId: string, symbols: string[], room: string): Promise<void> {
    this.logger.log(`Starting orderbook watcher for room ${room}`);
    const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
    try {
      while (this.subscribers.has(room)) {
        let orderbooks: OrderBook | OrderBooks;
        if (symbols.length === 1) {
          orderbooks = await exchange.exchange.watchOrderBook(symbols[0]);
          this.eventEmitter.emit(ORDERBOOK_UPDATE_EVENT, { room, data: orderbooks });
        } else {
          orderbooks = await exchange.exchange.watchOrderBookForSymbols(symbols);
          this.eventEmitter.emit(ORDERBOOKS_UPDATE_EVENT, { room, data: orderbooks });
        }
        await delay(1000);
      }
    } catch (err) {
      this.logger.error(`Error in orderbook watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      await this.cleanupWatcher(exchange, room, symbols);
    }
  }

  private async cleanupWatcher(exchange: any, room: string, symbols: string[]) {
    this.logger.log(`Stopped orderbook watcher for room ${room}`);
    this.watcherTasks.delete(room);
    if (symbols.length === 1 && exchange.exchange.has['unWatchOrderBook']) {
      await exchange.exchange.unWatchOrderBook(symbols[0]);
    } else if (symbols.length > 1 && exchange.exchange.has['unWatchOrderBookForSymbols']) {
      await exchange.exchange.unWatchOrderBookForSymbols(symbols);
    }
  }
}
