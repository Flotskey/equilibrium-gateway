import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { Exchange } from 'ccxt';
import { SessionStore } from 'src/session-store/session-store.interface';
import { RequiredCredentialsDto } from './dto/required-credentials.dto';

@Injectable()
export class PublicExchangeService {
  private readonly logger = new Logger(PublicExchangeService.name);

  constructor(
    @Inject('PublicSessionStore')
    private readonly sessionStore: SessionStore<Exchange>
  ) {}

  async getRequiredCredentials(exchangeId: string): Promise<RequiredCredentialsDto> {
    const exchange = await this.getExchange(exchangeId);
    return exchange.requiredCredentials;
  }

  private async getExchange(exchangeId: string): Promise<Exchange> {
    const id = exchangeId.toLowerCase();

    // 1. Validate if the exchange is supported by ccxt
    if (!ccxt[id]) {
      throw new NotFoundException(`Exchange '${exchangeId}' is not supported.`);
    }

    // 2. Try to get the instance from cache (early return)
    const cachedExchange = await this.sessionStore.get(id);
    if (cachedExchange) {
      return cachedExchange;
    }

    // 3. If not in cache, create, initialize, and store a new instance
    this.logger.log(`Creating new public instance for exchange: ${id}`);
    try {
      const newExchange = new ccxt[id]();
      await newExchange.loadMarkets();
      await this.sessionStore.set(id, newExchange);
      return newExchange;
    } catch (error) {
      this.logger.error(`Failed to initialize exchange ${id}:`, error.stack);
      throw new InternalServerErrorException(`Could not initialize exchange '${id}'.`);
    }
  }
}
