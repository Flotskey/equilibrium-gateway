import { Inject, Injectable, Logger } from '@nestjs/common';
import { SessionStore } from '../session-store/session-store.interface';
import { ExchangeCredentialsDto } from './dto/exchange-credentials.dto';
import { ExchangeFactory } from './exchange.factory';
import { ExchangeWrapper } from './wrappers/exchange-wrapper.interface';

@Injectable()
export class ExchangeInstanceService {
  private readonly logger = new Logger(ExchangeInstanceService.name);

  constructor(
    @Inject('PublicSessionStore') private readonly publicSessionStore: SessionStore<ExchangeWrapper>,
    @Inject('PrivateSessionStore') private readonly privateSessionStore: SessionStore<ExchangeWrapper>,
    private readonly exchangeFactory: ExchangeFactory
  ) {}

  /**
   * Get or create a public (shared) exchange instance.
   * @param exchangeId Exchange id (e.g. 'binance')
   */
  async getOrCreatePublicExchange(exchangeId: string): Promise<ExchangeWrapper> {
    const id = exchangeId.toLowerCase();
    let exchange = await this.publicSessionStore.get(id);
    if (!exchange) {
      this.logger.log(`Creating new public exchange instance for ${id}`);
      exchange = this.exchangeFactory.create(id);
      await exchange.loadMarkets();
      await this.publicSessionStore.set(id, exchange);
    }
    return exchange;
  }

  /**
   * Get or create a private (per-user) exchange instance.
   * @param userId User id
   * @param exchangeId Exchange id
   * @param creds Credentials for the exchange
   */
  async getOrCreatePrivateExchange(
    userId: string,
    exchangeId: string,
    creds: ExchangeCredentialsDto
  ): Promise<ExchangeWrapper> {
    const key = `${userId}:${exchangeId}`;
    let exchange = await this.privateSessionStore.get(key);
    if (!exchange) {
      this.logger.log(`Creating new private exchange instance for user ${userId}, exchange ${exchangeId}`);
      exchange = this.exchangeFactory.create(exchangeId, creds);
      await exchange.loadMarkets();
      await this.privateSessionStore.set(key, exchange);
    }
    return exchange;
  }

  /**
   * Get an existing private (per-user) exchange instance, or undefined if not found.
   * @param userId User id
   * @param exchangeId Exchange id
   */
  async getPrivateExchange(userId: string, exchangeId: string): Promise<ExchangeWrapper | undefined> {
    const key = `${userId}:${exchangeId}`;
    return this.privateSessionStore.get(key);
  }

  /**
   * Get an existing public exchange instance, or undefined if not found.
   * @param exchangeId Exchange id
   */
  async getPublicExchange(exchangeId: string): Promise<ExchangeWrapper | undefined> {
    const id = exchangeId.toLowerCase();
    return this.publicSessionStore.get(id);
  }
}
