import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ShortTickerDto } from './dto/short-ticker.dto';
import { PublicExchangeService } from './public-exchange.service';

@Controller('exchanges/public')
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

  @Get(':exchangeId/short-tickers')
  @ApiOkResponse({ type: ShortTickerDto, isArray: true })
  getShortTickers(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getShortTickers(exchangeId);
  }

  @Get('/list')
  getExchangesList(): Record<string, any> {
    return this.publicExchangeService.getExchangesList();
  }
}
