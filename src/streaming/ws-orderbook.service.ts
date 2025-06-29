import { Injectable, Logger } from '@nestjs/common';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';

@Injectable()
export class WsOrderbookService {
  private readonly logger = new Logger(WsOrderbookService.name);
  // Map<roomKey, Set<clientId>>
  private subscribers = new Map<string, Set<string>>();
  // Map<roomKey, Promise<void>>
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(private readonly exchangeInstanceService: ExchangeInstanceService) {}

  // Helper to generate room key
  private getRoomKey(type: string, exchangeId: string, symbols: string[]): string {
    return `${type}:${exchangeId}:${symbols.sort().join(',')}`;
  }

  // Single symbol
  async watchOrderBook(clientId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', exchangeId, [symbol]);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      this.watcherTasks.set(room, this.startOrderbookWatcher(exchangeId, [symbol], room));
    }
    return room;
  }
  async unWatchOrderBook(clientId: string, exchangeId: string, symbol: string): Promise<string> {
    const room = this.getRoomKey('orderbook', exchangeId, [symbol]);
    this.removeSubscriber(room, clientId);
    return room;
  }

  // Multiple symbols (batch)
  async watchOrderBookForSymbols(clientId: string, exchangeId: string, symbols: string[]): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', exchangeId, symbols);
    this.addSubscriber(room, clientId);
    if (!this.watcherTasks.has(room)) {
      this.watcherTasks.set(room, this.startOrderbookWatcher(exchangeId, symbols, room));
    }
    return room;
  }
  async unWatchOrderBookForSymbols(clientId: string, exchangeId: string, symbols: string[]): Promise<string> {
    const room = this.getRoomKey('orderbookForSymbols', exchangeId, symbols);
    this.removeSubscriber(room, clientId);
    return room;
  }

  // Internal: add/remove subscriber
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
      // this.stopOrderbookWatcher(room);
    }
  }

  // Internal: start/stop watcher (now uses ExchangeInstanceService)
  private async startOrderbookWatcher(exchangeId: string, symbols: string[], room: string): Promise<void> {
    this.logger.log(`Starting orderbook watcher for room ${room}`);
    const exchange = await this.exchangeInstanceService.getOrCreatePublicExchange(exchangeId);
    try {
      while (this.subscribers.has(room)) {
        // TODO: Integrate with CCXT Pro's watchOrderBook/watchOrderBookForSymbols
        // Emit updates to socket.io room
        // Stop when this.subscribers.has(room) === false
      }
    } catch (err) {
      this.logger.error(`Error in orderbook watcher for room ${room}: ${err.message}`, err.stack);
    } finally {
      this.logger.log(`Stopped orderbook watcher for room ${room}`);
      this.watcherTasks.delete(room);
    }
  }
}
