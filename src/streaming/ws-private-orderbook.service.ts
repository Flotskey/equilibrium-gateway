import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderBook, OrderBooks } from 'ccxt';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';
import { ORDERBOOK_UPDATE_EVENT, ORDERBOOKS_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class WsPrivateOrderbookService {
  private readonly logger = new Logger(WsPrivateOrderbookService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(type: string, userId: string, exchangeId: string, symbols: string[]): string {
    return `${type}:${userId}:${exchangeId}:${symbols.sort().join(',')}`;
  }

  async watchOrderBook(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbol: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('orderbook', userId, exchangeId, [symbol]);
    this.addSubscriber(room, userId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
      if (!exchange) {
        this.logger.warn(
          `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
        );
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOrderbookWatcher(userId, exchangeId, [symbol], room));
      return { room, started: true };
    }
    return { room, started: true };
  }
  async unWatchOrderBook(clientId: string, userId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', userId, exchangeId, [symbol]);
    this.removeSubscriber(room, userId);
    return room;
  }
  async watchOrderBookForSymbols(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey('orderbookForSymbols', userId, exchangeId, symbols);
    this.addSubscriber(room, userId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
      if (!exchange) {
        this.logger.warn(
          `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
        );
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startOrderbookWatcher(userId, exchangeId, symbols, room));
      return { room, started: true };
    }
    return { room, started: true };
  }
  async unWatchOrderBookForSymbols(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', userId, exchangeId, symbols);
    this.removeSubscriber(room, userId);
    return room;
  }
  private addSubscriber(room: string, userId: string) {
    if (!this.subscribers.has(room)) this.subscribers.set(room, new Set());
    this.subscribers.get(room)!.add(userId);
  }
  private removeSubscriber(room: string, userId: string) {
    if (!this.subscribers.has(room)) return;
    const set = this.subscribers.get(room)!;
    set.delete(userId);
    if (set.size === 0) {
      this.subscribers.delete(room);
      this.watcherTasks.delete(room);
    }
  }
  private async startOrderbookWatcher(
    userId: string,
    exchangeId: string,
    symbols: string[],
    room: string
  ): Promise<void> {
    this.logger.log(`Starting private orderbook watcher for room ${room}`);
    const exchange = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
    if (!exchange) {
      this.logger.warn(
        `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
      );
      this.watcherTasks.delete(room);
      return;
    }
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
      }
    } catch (err) {
      this.logger.error(`Error in private orderbook watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      this.logger.log(`Stopped private orderbook watcher for room ${room}`);
      this.watcherTasks.delete(room);
    }
  }
}
