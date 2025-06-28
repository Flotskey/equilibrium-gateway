import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeFactory } from 'src/exchange/exchange.factory';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';
import { BaseStreamingService } from './base-streaming.service';
import { EXCHANGE_PRIVATE_ORDERBOOK_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class PrivateOrderbookService extends BaseStreamingService {
  protected readonly logger = new Logger(PrivateOrderbookService.name);
  protected sessionStore: SessionStore<ExchangeWrapper>;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('PrivateSessionStore') sessionStore: SessionStore<ExchangeWrapper>,
    protected readonly exchangeFactory: ExchangeFactory
  ) {
    super(exchangeFactory);
    this.sessionStore = sessionStore;
  }

  async startWatcher(userId: string, exchangeId: string, symbol: string): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(userId, exchangeId, symbol);
    this.logger.log(`Starting private orderbook watcher for: ${subscriptionKey}`);
    const exchange = await super.getPrivateExchangeInstance(userId, exchangeId);

    if (!exchange.has['watchOrderBook']) {
      this.logger.warn(`Exchange ${exchangeId} does not support watchOrderBook. Stopping watcher.`);
      this.symbolSubscribers.delete(subscriptionKey);
      return;
    }

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const orderbook = await exchange.watchOrderBook(symbol);
        this.eventEmitter.emit(EXCHANGE_PRIVATE_ORDERBOOK_UPDATE_EVENT, { ...orderbook, exchangeId, userId });
      } catch (e) {
        this.logger.error(`Error in private orderbook watcher for ${subscriptionKey}: ${e.message}`, e.stack);
      }
    }
    if (exchange.has['unWatchOrderBook']) {
      await exchange.unWatchOrderBook(symbol);
    }
    this.logger.log(`Stopped private orderbook watcher for: ${subscriptionKey}`);
  }

  async handleClientDisconnect(clientId: string): Promise<void> {
    super.handleClientDisconnect(clientId);
    await this.cleanupUnwatch(
      clientId,
      async (userId: string, exchangeId: string) => super.getPrivateExchangeInstance(userId, exchangeId),
      (userId: string, exchangeId: string, symbol: string) => [symbol],
      'unWatchOrderBook'
    );
  }

  async subscribe(clientId: string, exchangeId: string, userId: string, symbols: string[]): Promise<void> {
    await this.getPrivateExchangeInstance(userId, exchangeId);
    for (const symbol of symbols) {
      const keyArgs = [userId, exchangeId, symbol];
      const subscriptionKey = this.getSubscriptionKey(...keyArgs);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        if (!this.watcherTasks.has(subscriptionKey)) {
          const watcherPromise = this.startWatcher(userId, exchangeId, symbol)
            .catch((e) => {
              this.logger.error(`Failed to start watcher for ${subscriptionKey}`, e.stack);
              this.symbolSubscribers.delete(subscriptionKey);
            })
            .finally(() => {
              this.watcherTasks.delete(subscriptionKey);
            });
          this.watcherTasks.set(subscriptionKey, watcherPromise);
        }
      }
      this.symbolSubscribers.get(subscriptionKey).add(clientId);
      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId).add(subscriptionKey);
    }
  }

  unsubscribe(clientId: string, exchangeId: string, userId: string, symbols: string[]): void {
    for (const symbol of symbols) {
      const keyArgs = [userId, exchangeId, symbol];
      const subscriptionKey = this.getSubscriptionKey(...keyArgs);
      if (this.symbolSubscribers.has(subscriptionKey)) {
        const subscribers = this.symbolSubscribers.get(subscriptionKey);
        subscribers.delete(clientId);
        this.clientSubscriptions.get(clientId)?.delete(subscriptionKey);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(subscriptionKey);
          // The watcher will exit naturally when it sees the key is gone
        }
      }
    }
  }
}
