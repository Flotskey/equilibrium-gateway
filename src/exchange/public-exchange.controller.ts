import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { FundingIntervalDto } from './dto/funding-interval.dto';
import { FundingIntervalsDto } from './dto/funding-intervals.dto';
import { FundingRateHistoryDto } from './dto/funding-rate-history.dto';
import { FundingRatesDto } from './dto/funding-rates.dto';
import { ShortMarketDto } from './dto/short-market.dto';
import { ShortTickerDto } from './dto/short-ticker.dto';
import { PublicExchangeService } from './public-exchange.service';

@Controller('ccxt/public')
export class PublicExchangeController {
  constructor(private publicExchangeService: PublicExchangeService) {}

  private readonly logger = new Logger(PublicExchangeController.name);

  @Get(':exchangeId/required-credentials')
  getRequiredCredentials(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getRequiredCredentials(exchangeId);
  }

  @Get(':exchangeId/timeframes')
  getTimeframes(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getTimeframes(exchangeId);
  }

  @Get(':exchangeId/ohlcv')
  @ApiQuery({ name: 'symbol', required: true, type: String })
  @ApiQuery({ name: 'timeframe', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'since', required: false, type: String })
  async getOhlcv(
    @Param('exchangeId') exchangeId: string,
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string
  ) {
    return this.publicExchangeService.getOhlcv(
      exchangeId,
      symbol,
      timeframe,
      limit ? parseInt(limit, 10) : undefined,
      since ? parseInt(since, 10) : undefined
    );
  }

  @Post(':exchangeId/short-tickers')
  @ApiOkResponse({ type: ShortTickerDto, isArray: true })
  @ApiBody({ type: Object, required: false })
  getShortTickers(@Param('exchangeId') exchangeId: string, @Body() params?: Record<string, any>) {
    return this.publicExchangeService.getShortTickers(exchangeId, params);
  }

  @Get(':exchangeId/short-markets')
  @ApiOkResponse({ type: ShortMarketDto, isArray: true })
  getShortMarkets(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getShortMarkets(exchangeId);
  }

  @Get(':exchangeId/market/:symbol')
  getMarket(@Param('exchangeId') exchangeId: string, @Param('symbol') symbol: string) {
    return this.publicExchangeService.getMarket(exchangeId, symbol);
  }

  @Get(':exchangeId/funding-rates')
  @ApiOkResponse({ description: 'Funding rates for the specified exchange and symbols' })
  @ApiBody({ type: FundingRatesDto, required: false })
  getFundingRates(@Param('exchangeId') exchangeId: string, @Body() dto?: FundingRatesDto) {
    return this.publicExchangeService.getFundingRates(exchangeId, dto?.symbols, dto?.params);
  }

  @Get(':exchangeId/funding-rate/:symbol')
  @ApiOkResponse({ description: 'Funding rate for the specified exchange and symbol' })
  getFundingRate(@Param('exchangeId') exchangeId: string, @Param('symbol') symbol: string) {
    return this.publicExchangeService.getFundingRate(exchangeId, symbol);
  }

  @Get(':exchangeId/funding-intervals')
  @ApiOkResponse({ description: 'Available funding intervals for the specified exchange' })
  @ApiBody({ type: FundingIntervalsDto, required: false })
  getFundingIntervals(@Param('exchangeId') exchangeId: string, @Body() dto?: FundingIntervalsDto) {
    return this.publicExchangeService.getFundingIntervals(exchangeId, dto?.params);
  }

  @Get(':exchangeId/funding-interval/:symbol')
  @ApiOkResponse({ description: 'Funding interval information for the specified exchange and interval' })
  @ApiBody({ type: FundingIntervalDto, required: false })
  getFundingInterval(
    @Param('exchangeId') exchangeId: string,
    @Param('symbol') symbol: string,
    @Body() dto?: FundingIntervalDto
  ) {
    return this.publicExchangeService.getFundingInterval(exchangeId, symbol, dto?.params);
  }

  @Get(':exchangeId/funding-rate-history/:symbol')
  @ApiOkResponse({ description: 'Funding rate history for the specified exchange and symbol' })
  @ApiQuery({ name: 'since', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiBody({ type: FundingRateHistoryDto, required: false })
  getFundingRateHistory(
    @Param('exchangeId') exchangeId: string,
    @Param('symbol') symbol: string,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
    @Body() dto?: FundingRateHistoryDto
  ) {
    return this.publicExchangeService.getFundingRateHistory(
      exchangeId,
      symbol,
      since ? parseInt(since, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      dto?.params
    );
  }

  @Get('list')
  getExchangesList(): string[] {
    return this.publicExchangeService.getExchangesList();
  }
}
