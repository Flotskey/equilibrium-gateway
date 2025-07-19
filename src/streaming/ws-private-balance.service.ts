import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Balances } from 'ccxt';
import { ExchangeInstanceService } from '../exchange/exchange-instance.service';
import { BALANCE_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class WsPrivateBalanceService {
  private readonly logger = new Logger(WsPrivateBalanceService.name);
  private subscribers = new Map<string, Set<string>>();
  private watcherTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly exchangeInstanceService: ExchangeInstanceService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private getRoomKey(userId: string, exchangeId: string): string {
    return `balance:${userId}:${exchangeId}`;
  }

  async watchBalance(
    clientId: string,
    userId: string,
    exchangeId: string
  ): Promise<{ room: string; started: boolean }> {
    const room = this.getRoomKey(userId, exchangeId);
    this.addSubscriber(room, userId);
    if (!this.watcherTasks.has(room)) {
      const exchange = await this.exchangeInstanceService.getPrivateExchange(userId, exchangeId);
      if (!exchange) {
        this.logger.warn(
          `No private exchange instance found for user ${userId}, exchange ${exchangeId}. Did you call createConnection?`
        );
        return { room, started: false };
      }
      this.watcherTasks.set(room, this.startBalanceWatcher(userId, exchangeId, room));
      return { room, started: true };
    }
    return { room, started: true };
  }

  async unWatchBalance(clientId: string, userId: string, exchangeId: string): Promise<string> {
    const room = this.getRoomKey(userId, exchangeId);
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

  private async startBalanceWatcher(userId: string, exchangeId: string, room: string): Promise<void> {
    this.logger.log(`Starting private balance watcher for room ${room}`);
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
        this.logger.log(`Stopped private balance watcher for room ${room}`);
        this.watcherTasks.delete(room);
        return;
      }

      try {
        const balance: Balances = await exchangeWrapper.exchange.watchBalance();
        this.eventEmitter.emit(BALANCE_UPDATE_EVENT, { room, data: balance });
      } catch (err) {
        this.logger.error(`Error in private balance watcher for room ${room}: ${err.message}`, err.stack);
      }
    }, 1000);

    // Store the interval ID for cleanup
    this.watcherTasks.set(room, Promise.resolve());
  }
}
