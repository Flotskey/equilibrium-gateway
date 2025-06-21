import { BadRequestException, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { CcxtExchangeWrapper } from './wrappers/ccxt-exchange-wrapper';
import { ExchangeWrapper } from './wrappers/exchange-wrapper.interface';

export abstract class ExchangeFactory {
  abstract create(exchangeId: string, config?: Record<string, any>): ExchangeWrapper;
}

@Injectable()
export class CcxtExchangeFactory implements ExchangeFactory {
  create(exchangeId: string, config?: Record<string, any>): ExchangeWrapper {
    const exchangeIdLower = exchangeId.toLowerCase();
    if (!(exchangeIdLower in ccxt)) {
      throw new BadRequestException(`Exchange '${exchangeId}' is not supported.`);
    }
    return new CcxtExchangeWrapper(exchangeIdLower, config);
  }
}
