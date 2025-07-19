import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Trade } from 'ccxt';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';
import { MY_TRADES_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class WsPrivateTradesService {
  private readonly logger = new Logger(WsPrivateTradesService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(userId: string, exchangeId: string, symbol?: string): string {
    return symbol ? `myTrades:${userId}:${exchangeId}:${symbol}` : `myTrades:${userId}:${exchangeId}`;
  }

  async watchMyTrades(
    clientId: string,
    userId: string,
    exchangeId: string,
    symbol?: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey(userId, exchangeId, symbol);
    this.addSubscriber(room, userId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
      if (!exchange) {
        this.logger.warn(
          `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
        );
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startMyTradesWatcher(userId, exchangeId, room, symbol));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchMyTrades(clientId: string, userId: string, exchangeId: string, symbol?: string): Promise<string> {
    const room = this.getRoomKey(userId, exchangeId, symbol);
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

  private async startMyTradesWatcher(userId: string, exchangeId: string, room: string, symbol?: string): Promise<void> {
    this.logger.log(`Starting private my trades watcher for room ${room}`);
    const exchangeWrapper = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
    if (!exchangeWrapper) {
      this.logger.warn(
        `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
      );
      this.watcherTasks.delete(room);
      return;
    }

    const interval = setInterval(async () => {
      if (!this.subscribers.has(room)) {
        clearInterval(interval);
        this.logger.log(`Stopped private my trades watcher for room ${room}`);
        this.watcherTasks.delete(room);
        return;
      }

      try {
        const trades: Trade[] = symbol
          ? await exchangeWrapper.exchange.watchMyTrades(symbol)
          : await exchangeWrapper.exchange.watchMyTrades();
        this.eventEmitter.emit(MY_TRADES_UPDATE_EVENT, { room, data: trades });
      } catch (err) {
        this.logger.error(`Error in private my trades watcher for room ${room}: ${err.message}`, err.stack);
      }
    }, 1000);

    // Store the interval ID for cleanup
    this.watcherTasks.set(room, Promise.resolve());
  }
}
