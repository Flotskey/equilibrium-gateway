import { Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { RequiredCredentialsDto } from './dto/required-credentials.dto';
import { Dictionary, Exchange, Market } from 'ccxt';

@Injectable()
export class PublicExchangeService {
  private publicExchangesCache: Map<string, Exchange> = new Map();

  getRequiredCredentials(exchangeId: string): RequiredCredentialsDto {
    const exchange = this.getExchange(exchangeId);
    return exchange.requiredCredentials;
  }

  async getMarkets(exchangeId: string): Promise<Dictionary<Market>> {
    const exchange = this.getExchange(exchangeId);
    return await exchange.loadMarkets(true);
  }

  private getExchange(exchangeId: string): Exchange {
    exchangeId = exchangeId.toLowerCase();
    if (!this.publicExchangesCache.has(exchangeId)) {
      this.publicExchangesCache.set(exchangeId, new ccxt[exchangeId]());
    }
    return this.publicExchangesCache.get(exchangeId);
  }
}
