import { Injectable, Logger } from '@nestjs/common';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';

@Injectable()
export class WsPrivateOrderbookService {
  private readonly logger = new Logger(WsPrivateOrderbookService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(private readonly exchangeInstanceService: ExchangeInstanceService) {}

  private getRoomKey(type: string, userId: string, exchangeId: string, symbols: string[]): string {
    return `${type}:${userId}:${exchangeId}:${symbols.sort().join(',')}`;
  }

  async watchOrderBook(clientId: string, userId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', userId, exchangeId, [symbol]);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      this.watcherTasks.set(room, this.startOrderbookWatcher(userId, exchangeId, [symbol], room));
    }
    return room;
  }
  async unWatchOrderBook(clientId: string, userId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', userId, exchangeId, [symbol]);
    this.removeSubscriber(room, clientId);
    return room;
  }
  async watchOrderBookForSymbols(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', userId, exchangeId, symbols);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      this.watcherTasks.set(room, this.startOrderbookWatcher(userId, exchangeId, symbols, room));
    }
    return room;
  }
  async unWatchOrderBookForSymbols(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbols: string[]
  ): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', userId, exchangeId, symbols);
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
      // Optionally: stop watcher here
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
      throw new Error('Private exchange instance not found. Please create a connection first.');
    }
    try {
      while (this.subscribers.has(room)) {
        // TODO: Integrate with CCXT Pro's watchOrderBook/watchOrderBookForSymbols
        // Emit updates to socket.io room
        // Stop when this.subscribers.has(room) === false
      }
    } catch (err) {
      this.logger.error(`Error in private orderbook watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      this.logger.log(`Stopped private orderbook watcher for room ${room}`);
      this.watcherTasks.delete(room);
    }
  }
}
