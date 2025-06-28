import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeFactory } from 'src/exchange/exchange.factory';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';
import { BaseStreamingService } from './base-streaming.service';
import { EXCHANGE_PUBLIC_ORDERBOOK_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class PublicOrderbookService extends BaseStreamingService {
  protected readonly logger = new Logger(PublicOrderbookService.name);
  protected sessionStore: SessionStore<ExchangeWrapper>;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('PublicSessionStore') sessionStore: SessionStore<ExchangeWrapper>,
    protected readonly exchangeFactory: ExchangeFactory
  ) {
    super(exchangeFactory);
    this.sessionStore = sessionStore;
  }

  async handleClientDisconnect(clientId: string): Promise<void> {
    super.handleClientDisconnect(clientId);
    await this.cleanupUnwatch(
      clientId,
      async (exchangeId: string) => super.getPublicExchangeInstance(exchangeId, this.exchangeFactory),
      (exchangeId: string, symbol: string) => [symbol],
      'unWatchOrderBook'
    );
  }

  async startWatcher(exchangeId: string, symbol: string): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
    this.logger.log(`Starting orderbook watcher for: ${subscriptionKey}`);
    const exchange = await super.getPublicExchangeInstance(exchangeId, this.exchangeFactory);

    if (!exchange.has['watchOrderBook']) {
      this.logger.warn(`Exchange ${exchangeId} does not support watchOrderBook. Stopping watcher.`);
      this.symbolSubscribers.delete(subscriptionKey);
      return;
    }

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const orderbook = await exchange.watchOrderBook(symbol);
        this.eventEmitter.emit(EXCHANGE_PUBLIC_ORDERBOOK_UPDATE_EVENT, { ...orderbook, exchangeId });
      } catch (e) {
        this.logger.error(`Error in orderbook watcher for ${subscriptionKey}: ${e.message}`, e.stack);
        // CCXT Pro handles reconnections, so we don't break the loop.
      }
    }
    if (exchange.has['unWatchOrderBook']) {
      await exchange.unWatchOrderBook(symbol);
    }
    this.logger.log(`Stopped orderbook watcher for: ${subscriptionKey}`);
  }

  async subscribe(clientId: string, exchangeId: string, symbols: string[]): Promise<void> {
    await this.getPublicExchangeInstance(exchangeId, this.exchangeFactory);
    for (const symbol of symbols) {
      const keyArgs = [exchangeId, symbol];
      const subscriptionKey = this.getSubscriptionKey(...keyArgs);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        if (!this.watcherTasks.has(subscriptionKey)) {
          const watcherPromise = this.startWatcher(exchangeId, symbol)
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
}
