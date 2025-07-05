import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { CcxtRequiredCredentials } from 'src/models/ccxt';
import { SessionStore } from 'src/session-store/session-store.interface';
import { ExchangeFactory } from './exchange.factory';
import { ExchangeWrapper } from './wrappers/exchange-wrapper.interface';

@Injectable()
export class PublicExchangeService {
  private readonly logger = new Logger(PublicExchangeService.name);

  constructor(
    @Inject('PublicSessionStore')
    private readonly sessionStore: SessionStore<ExchangeWrapper>,
    private readonly exchangeFactory: ExchangeFactory
  ) {}

  async getRequiredCredentials(exchangeId: string): Promise<CcxtRequiredCredentials> {
    const exchange = await this.getOrCreateExchange(exchangeId);
    return exchange.requiredCredentials;
  }

  async getTimeframes(exchangeId: string): Promise<any> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    return exchangeWrapper.exchange.timeframes;
  }

  async getOhlcv(exchangeId: string, symbol: string, timeframe: string, limit?: number, since?: number): Promise<any> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    return exchangeWrapper.exchange.fetchOHLCV(symbol, timeframe, since, limit);
  }

  private async getOrCreateExchange(exchangeId: string): Promise<ExchangeWrapper> {
    const id = exchangeId.toLowerCase();

    const cachedExchange = await this.sessionStore.get(id);
    if (cachedExchange) {
      return cachedExchange;
    }

    this.logger.log(`Creating new public instance for exchange: ${id}`);
    try {
      const newExchange = this.exchangeFactory.create(id);
      await newExchange.loadMarkets();
      await this.sessionStore.set(id, newExchange);
      return newExchange;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException(error.message);
      }
      this.logger.error(`Failed to initialize exchange ${id}:`, error.stack);
      throw new InternalServerErrorException(`Could not initialize exchange '${id}'.`);
    }
  }
}
