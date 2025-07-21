import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import * as ccxt from 'ccxt';
import { Dictionary, OHLCV } from 'ccxt';
import { CcxtMarket, CcxtRequiredCredentials } from 'src/models/ccxt';
import { SessionStore } from 'src/session-store/session-store.interface';
import { ShortMarketDto } from './dto/short-market.dto';
import { ShortTickerDto } from './dto/short-ticker.dto';
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

  async getTimeframes(exchangeId: string): Promise<Dictionary<string | number>> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    return exchangeWrapper.exchange.timeframes;
  }

  async getOhlcv(
    exchangeId: string,
    symbol: string,
    timeframe: string,
    limit?: number,
    since?: number
  ): Promise<OHLCV[]> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    return exchangeWrapper.exchange.fetchOHLCV(symbol, timeframe, since, limit ?? 100);
  }

  async getShortMarkets(exchangeId: string): Promise<ShortMarketDto[]> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    const markets = exchangeWrapper.exchange.markets;
    return Object.keys(markets)
      .map((key) => {
        return {
          symbol: key,
          active: markets[key].active
        } as ShortMarketDto;
      })
      .filter((market) => market.active);
  }

  async getShortTickers(exchangeId: string, params?: Record<string, any>): Promise<ShortTickerDto[]> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    var tickers = params
      ? await exchangeWrapper.exchange.fetchTickers(undefined, params)
      : await exchangeWrapper.exchange.fetchTickers();
    return Object.keys(tickers)
      .map((key) => {
        return {
          symbol: key,
          high: tickers[key].high,
          low: tickers[key].low,
          last: tickers[key].last,
          change: tickers[key].change
        } as ShortTickerDto;
      })
      .filter((ticker) => ticker.last != undefined);
  }

  async getMarket(exchangeId: string, symbol: string): Promise<CcxtMarket> {
    const exchangeWrapper = await this.getOrCreateExchange(exchangeId);
    return exchangeWrapper.exchange.markets[symbol];
  }

  getExchangesList() {
    // filter out duplicate exchange names
    return (ccxt.exchanges as unknown as string[]).filter((exchange) => {
      return exchange != 'gateio' && exchange != 'huobi';
    });
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
