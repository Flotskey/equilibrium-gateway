import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Exchange } from 'ccxt';
import { ExchangeFactory } from 'src/exchange/exchange.factory';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';
import { EXCHANGE_TICKER_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class PublicTickerService {
  private readonly logger = new Logger(PublicTickerService.name);
  private symbolSubscribers = new Map<string, Set<string>>();
  private clientSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('PublicSessionStore')
    private readonly sessionStore: SessionStore<ExchangeWrapper>,
    private readonly exchangeFactory: ExchangeFactory
  ) {}

  async subscribe(clientId: string, exchangeId: string, symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        this.startWatcher(exchangeId, symbol).catch((e) =>
          this.logger.error(`Failed to start watcher for ${subscriptionKey}`, e.stack)
        );
      }
      this.symbolSubscribers.get(subscriptionKey).add(clientId);

      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId).add(subscriptionKey);
    }
  }

  unsubscribe(clientId: string, exchangeId: string, symbols: string[]): void {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
      if (this.symbolSubscribers.has(subscriptionKey)) {
        const subscribers = this.symbolSubscribers.get(subscriptionKey);
        subscribers.delete(clientId);
        this.clientSubscriptions.get(clientId)?.delete(subscriptionKey);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(subscriptionKey);
        }
      }
    }
  }

  handleClientDisconnect(clientId: string): void {
    const clientSubs = this.clientSubscriptions.get(clientId);
    if (clientSubs) {
      for (const subscriptionKey of clientSubs) {
        const [exchangeId, symbol] = this.parseSubscriptionKey(subscriptionKey);
        this.unsubscribe(clientId, exchangeId, [symbol]);
      }
      this.clientSubscriptions.delete(clientId);
    }
  }

  private async startWatcher(exchangeId: string, symbol: string): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
    this.logger.log(`Starting watcher for: ${subscriptionKey}`);
    const exchange = await this.getExchangeInstance(exchangeId);

    if (!exchange.has['watchTicker']) {
      this.logger.warn(`Exchange ${exchangeId} does not support watchTicker. Stopping watcher.`);
      this.symbolSubscribers.delete(subscriptionKey);
      return;
    }

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const ticker = await exchange.watchTicker(symbol);
        this.eventEmitter.emit(EXCHANGE_TICKER_UPDATE_EVENT, { ...ticker, exchangeId });
      } catch (e) {
        this.logger.error(`Error in watcher for ${subscriptionKey}: ${e.message}`, e.stack);
        // CCXT Pro handles reconnections, so we don't break the loop.
        // The loop will continue, and watchTicker will attempt to reconnect on the next iteration.
      }
    }
    this.logger.log(`Stopped watcher for: ${subscriptionKey}`);
  }

  private async getExchangeInstance(exchangeId: string): Promise<Exchange> {
    const exchangeIdLower = exchangeId.toLowerCase();
    let exchangeWrapper = await this.sessionStore.get(exchangeIdLower);

    if (!exchangeWrapper) {
      this.logger.log(`Creating new public exchange instance for ${exchangeIdLower}`);
      try {
        exchangeWrapper = this.exchangeFactory.create(exchangeIdLower);
        await exchangeWrapper.loadMarkets();
        await this.sessionStore.set(exchangeIdLower, exchangeWrapper);
        this.logger.log(`Successfully created and stored exchange instance for ${exchangeIdLower}`);
      } catch (error) {
        this.logger.error(`Failed to create exchange instance for ${exchangeIdLower}:`, error.stack);
        throw new Error(`Could not create exchange instance for ${exchangeId}: ${error.message}`);
      }
    }

    // We need the raw ccxt instance for websocket methods
    return exchangeWrapper.exchange;
  }

  private getSubscriptionKey(exchangeId: string, symbol: string): string {
    return `${exchangeId}:${symbol}`;
  }

  private parseSubscriptionKey(subscriptionKey: string): [string, string] {
    return subscriptionKey.split(':') as [string, string];
  }
}
