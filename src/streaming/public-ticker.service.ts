import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExchangeFactory } from 'src/exchange/exchange.factory';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';
import { BaseStreamingService } from './base-streaming.service';
import { EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class PublicTickerService extends BaseStreamingService {
  protected readonly logger = new Logger(PublicTickerService.name);
  protected sessionStore: SessionStore<ExchangeWrapper>;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('PublicSessionStore') sessionStore: SessionStore<ExchangeWrapper>,
    protected readonly exchangeFactory: ExchangeFactory
  ) {
    super(exchangeFactory);
    this.sessionStore = sessionStore;
  }

  async startWatcher(exchangeId: string, symbol: string): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
    this.logger.log(`Starting watcher for: ${subscriptionKey}`);
    const exchange = await super.getPublicExchangeInstance(exchangeId, this.exchangeFactory);

    if (!exchange.has['watchTicker']) {
      this.logger.warn(`Exchange ${exchangeId} does not support watchTicker. Stopping watcher.`);
      this.symbolSubscribers.delete(subscriptionKey);
      return;
    }

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const ticker = await exchange.watchTicker(symbol);
        this.eventEmitter.emit(EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT, { ...ticker, exchangeId });
      } catch (e) {
        this.logger.error(`Error in watcher for ${subscriptionKey}: ${e.message}`, e.stack);
        // CCXT Pro handles reconnections, so we don't break the loop.
      }
    }
    if (exchange.has['unWatchTickers']) {
      await exchange.unWatchTickers([symbol]);
    }
    this.logger.log(`Stopped watcher for: ${subscriptionKey}`);
  }

  async handleClientDisconnect(clientId: string): Promise<void> {
    super.handleClientDisconnect(clientId);
    await this.cleanupUnwatch(
      clientId,
      async (exchangeId: string) => super.getPublicExchangeInstance(exchangeId, this.exchangeFactory),
      (exchangeId: string, symbol: string) => [[symbol]],
      'unWatchTickers'
    );
  }
}
