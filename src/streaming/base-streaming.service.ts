import { Logger } from '@nestjs/common';
import { ExchangeFactory } from 'src/exchange/exchange.factory';
import { ExchangeWrapper } from 'src/exchange/wrappers/exchange-wrapper.interface';
import { SessionStore } from 'src/session-store/session-store.interface';

export abstract class BaseStreamingService {
  protected readonly logger = new Logger(this.constructor.name);
  protected symbolSubscribers = new Map<string, Set<string>>();
  protected clientSubscriptions = new Map<string, Set<string>>();
  protected abstract sessionStore: SessionStore<ExchangeWrapper>;
  protected watcherTasks = new Map<string, Promise<void>>();

  constructor(protected readonly exchangeFactory: ExchangeFactory) {
    this.exchangeFactory = exchangeFactory;
  }

  // Default: join args with ':'
  getSubscriptionKey(...args: any[]): string {
    return args.join(':');
  }

  // Default: split by ':'
  parseSubscriptionKey(key: string): any[] {
    return key.split(':');
  }

  abstract startWatcher(...args: any[]): Promise<void>;

  async subscribe(clientId: string, ...args: any[]): Promise<void> {
    const exchangeId = args[0];
    await this.getPublicExchangeInstance(exchangeId, this.exchangeFactory);
    for (const symbol of args[args.length - 1]) {
      const keyArgs = args.slice(0, -1).concat(symbol);
      const subscriptionKey = this.getSubscriptionKey(...keyArgs);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        if (!this.watcherTasks.has(subscriptionKey)) {
          const watcherPromise = this.startWatcher(...keyArgs)
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

  unsubscribe(clientId: string, ...args: any[]): void {
    for (const symbol of args[args.length - 1]) {
      const keyArgs = args.slice(0, -1).concat(symbol);
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

  handleClientDisconnect(clientId: string): void {
    const clientSubs = this.clientSubscriptions.get(clientId);
    if (clientSubs) {
      for (const subscriptionKey of clientSubs) {
        const args = this.parseSubscriptionKey(subscriptionKey);
        this.unsubscribe(clientId, args[0], ...args.slice(1));
      }
      this.clientSubscriptions.delete(clientId);
    }
  }

  /**
   * DRY helper for child services: after unsubscribing, call the appropriate unwatch method for each symbol
   * with no more subscribers. getExchange: (args) => Promise<Exchange>, getUnwatchArgs: (args) => any[], unwatchMethod: string
   */
  protected async cleanupUnwatch(
    clientId: string,
    getExchange: (...args: any[]) => Promise<any>,
    getUnwatchArgs: (...args: any[]) => any[],
    unwatchMethod: string
  ): Promise<void> {
    const clientSubs = this.clientSubscriptions.get(clientId);
    if (!clientSubs) return;
    for (const subscriptionKey of clientSubs) {
      const args = this.parseSubscriptionKey(subscriptionKey);
      if (!this.symbolSubscribers.has(subscriptionKey)) {
        const exchange = await getExchange(...args);
        if (exchange.has && exchange.has[unwatchMethod]) {
          await exchange[unwatchMethod](...getUnwatchArgs(...args));
        }
      }
    }
    this.clientSubscriptions.delete(clientId);
  }

  /**
   * Get or create a public exchange instance, using the exchangeFactory if needed.
   * Returns the raw ccxt exchange instance.
   */
  protected async getPublicExchangeInstance(exchangeId: string, exchangeFactory: ExchangeFactory): Promise<any> {
    const exchangeIdLower = exchangeId.toLowerCase();
    // Always check the session store first
    let exchangeWrapper = await this.sessionStore.get(exchangeIdLower);
    if (!exchangeWrapper) {
      this.logger.log(`Creating new public exchange instance for ${exchangeIdLower}`);
      try {
        exchangeWrapper = exchangeFactory.create(exchangeIdLower);
        await exchangeWrapper.loadMarkets();
        await this.sessionStore.set(exchangeIdLower, exchangeWrapper);
        this.logger.log(`Successfully created and stored exchange instance for ${exchangeIdLower}`);
      } catch (error) {
        this.logger.error(`Failed to create exchange instance for ${exchangeIdLower}:`, error.stack);
        throw new Error(`Could not create exchange instance for ${exchangeId}: ${error.message}`);
      }
    }
    return exchangeWrapper.exchange;
  }

  /**
   * Get a private exchange instance for a user from the session store. Throws if not found.
   * Returns the raw ccxt exchange instance.
   */
  protected async getPrivateExchangeInstance(userId: string, exchangeId: string): Promise<any> {
    const sessionKey = `${userId}:${exchangeId.toLowerCase()}`;
    const exchangeWrapper = await this.sessionStore.get(sessionKey);
    if (!exchangeWrapper) {
      throw new Error(`Private exchange instance for ${sessionKey} not found in session store.`);
    }
    return exchangeWrapper.exchange;
  }

  /**
   * Standardized room naming for all streaming services.
   * type: 'ticker' | 'orderbook',
   * scope: 'public' | 'private',
   * exchangeId, symbol, userId (optional)
   */
  public getRoomName(
    type: 'ticker' | 'orderbook',
    scope: 'public' | 'private',
    exchangeId: string,
    symbol: string,
    userId?: string
  ): string {
    if (scope === 'public') {
      return `${type}:${exchangeId}:${symbol}`;
    } else {
      return userId ? `private:${userId}:${type}:${exchangeId}:${symbol}` : `private:${type}:${exchangeId}:${symbol}`;
    }
  }

  /**
   * Cleanup all watcher loops and subscriptions for a client (memory leak prevention).
   */
  protected async cleanupAllWatchers(): Promise<void> {
    this.symbolSubscribers.clear();
    this.clientSubscriptions.clear();
    // Optionally, add more cleanup logic if needed
  }
}
