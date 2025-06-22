import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ccxt from 'ccxt';
import { Exchange } from 'ccxt';
import { TICKER_UPDATED_EVENT } from './streaming-events.constants';

@Injectable()
export class PublicTickerService {
  private readonly logger = new Logger(PublicTickerService.name);
  private symbolSubscribers = new Map<string, Set<string>>();
  private clientSubscriptions = new Map<string, Set<string>>();
  private exchangeInstances = new Map<string, Exchange>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async subscribe(clientId: string, exchangeId: string, symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);

      // Check if client is already subscribed to this symbol
      if (this.symbolSubscribers.has(subscriptionKey) && this.symbolSubscribers.get(subscriptionKey)?.has(clientId)) {
        this.logger.debug(`Client ${clientId} already subscribed to ${subscriptionKey}`);
        continue; // Skip duplicate subscription
      }

      if (!this.symbolSubscribers.has(subscriptionKey)) {
        this.symbolSubscribers.set(subscriptionKey, new Set());
        this.startWatcher(exchangeId, symbol).catch((e) =>
          this.logger.error(`Failed to start watcher for ${subscriptionKey}`, e.stack)
        );
      }
      this.symbolSubscribers.get(subscriptionKey)?.add(clientId);

      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId)?.add(subscriptionKey);
    }
  }

  unsubscribe(clientId: string, exchangeId: string, symbols: string[]): void {
    for (const symbol of symbols) {
      const subscriptionKey = this.getSubscriptionKey(exchangeId, symbol);
      if (this.symbolSubscribers.has(subscriptionKey)) {
        const subscribers = this.symbolSubscribers.get(subscriptionKey);
        subscribers?.delete(clientId);
        this.clientSubscriptions.get(clientId)?.delete(subscriptionKey);
        if (subscribers?.size === 0) {
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
    const exchange = await this.getOrCreateExchangeInstance(exchangeId);

    while (this.symbolSubscribers.has(subscriptionKey)) {
      try {
        const ticker = await exchange.watchTicker(symbol);
        this.eventEmitter.emit(TICKER_UPDATED_EVENT, { ...ticker, exchangeId });
      } catch (e) {
        this.logger.error(`Error in watcher for ${subscriptionKey}: ${e.message}`, e.stack);
        this.symbolSubscribers.delete(subscriptionKey);
        // CCXT Pro handles reconnections. If it throws, it's often a critical error.
        break;
      }
    }
    this.logger.log(`Stopped watcher for: ${subscriptionKey}`);
  }

  private async getOrCreateExchangeInstance(exchangeId: string): Promise<Exchange> {
    if (this.exchangeInstances.has(exchangeId)) {
      const exchange = this.exchangeInstances.get(exchangeId);
      if (exchange) {
        return exchange;
      }
    }
    this.logger.log(`Creating new CCXT.pro instance for ${exchangeId}`);
    const proExchangeId = exchangeId.toLowerCase();
    const exchangeClass = ccxt.pro[proExchangeId];
    if (!exchangeClass) {
      throw new Error(`Exchange ${exchangeId} does not support websockets via ccxt.pro`);
    }
    const exchange = new exchangeClass({ enableRateLimit: true });
    this.exchangeInstances.set(exchangeId, exchange);
    return exchange;
  }

  private getSubscriptionKey(exchangeId: string, symbol: string): string {
    return `${exchangeId}:${symbol}`;
  }

  private parseSubscriptionKey(subscriptionKey: string): [string, string] {
    return subscriptionKey.split(':') as [string, string];
  }
}
