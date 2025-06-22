import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Exchange } from 'ccxt';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';
import { EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT } from './streaming-events.constants';

@Injectable()
export class PrivateTickerService {
  private readonly logger = new Logger(PrivateTickerService.name);
  private symbolSubscribers = new Map<string, Set<string>>(); // key: `userId:exchangeId:symbol`, value: Set<clientId>
  private clientSubscriptions = new Map<string, Set<string>>(); // key: `clientId`, value: Set<subscriptionKey>

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('PrivateSessionStore')
    private readonly sessionStore: SessionStore<ExchangeWrapper>
  ) {}

  async subscribe(clientId: string, userId: string, exchangeId: string, symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(userId, exchangeId, symbol);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        this.startWatcher(userId, exchangeId, symbol).catch((e) =>
          this.logger.error(`Failed to start private watcher for ${subscriptionKey}`, e.stack)
        );
      }
      this.symbolSubscribers.get(subscriptionKey).add(clientId);

      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId).add(subscriptionKey);
    }
  }

  unsubscribe(clientId: string, userId: string, exchangeId: string, symbols: string[]): void {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(userId, exchangeId, symbol);
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
        const [userId, exchangeId, symbol] = this.parseSubscriptionKey(subscriptionKey);
        this.unsubscribe(clientId, userId, exchangeId, [symbol]);
      }
      this.clientSubscriptions.delete(clientId);
    }
  }

  private async startWatcher(userId: string, exchangeId: string, symbol: string): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(userId, exchangeId, symbol);
    this.logger.log(`Starting private watcher for: ${subscriptionKey}`);
    const exchange = await this.getExchangeInstance(userId, exchangeId);

    if (!exchange.has['watchTicker']) {
      this.logger.warn(`Exchange ${exchangeId} does not support watchTicker. Stopping watcher.`);
      this.symbolSubscribers.delete(subscriptionKey);
      return;
    }

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const ticker = await exchange.watchTicker(symbol);
        this.eventEmitter.emit(EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT, { ...ticker, exchangeId, userId });
      } catch (e) {
        this.logger.error(`Error in private watcher for ${subscriptionKey}: ${e.message}`, e.stack);
        this.symbolSubscribers.delete(subscriptionKey);
        break;
      }
    }
    this.logger.log(`Stopped private watcher for: ${subscriptionKey}`);
  }

  private async getExchangeInstance(userId: string, exchangeId: string): Promise<Exchange> {
    const sessionKey = `${userId}:${exchangeId.toLowerCase()}`;
    const exchangeWrapper = await this.sessionStore.get(sessionKey);
    if (!exchangeWrapper) {
      throw new Error(`Private exchange instance for ${sessionKey} not found in session store.`);
    }
    return exchangeWrapper.exchange;
  }

  private getSubscriptionKey(userId: string, exchangeId: string, symbol: string): string {
    return `${userId}:${exchangeId}:${symbol}`;
  }

  private parseSubscriptionKey(subscriptionKey: string): [string, string, string] {
    return subscriptionKey.split(':') as [string, string, string];
  }
}
