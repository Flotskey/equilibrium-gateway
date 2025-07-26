import { Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CcxtFundingRate } from 'src/models/ccxt/ccxt-funding-rate.model';
import { CacheStatsDto } from './dto/cache-stats.dto';
import { FundingRatesCache, FundingRatesMonitorService } from './funding-rates-monitor.service';

@Controller('funding-rates-monitor')
@ApiTags('Funding Rates Monitor')
export class FundingRatesMonitorController {
  private readonly logger = new Logger(FundingRatesMonitorController.name);

  constructor(private readonly fundingRatesMonitorService: FundingRatesMonitorService) {}

  @Get('cache')
  @ApiOkResponse({
    description: 'Get the complete funding rates cache for all symbols and exchanges',
    type: Object
  })
  getFundingRatesCache(): FundingRatesCache {
    return this.fundingRatesMonitorService.getFundingRatesCache();
  }

  @Get('symbol/:symbol')
  @ApiOkResponse({
    description: 'Get funding rates for a specific symbol across all exchanges',
    type: Object
  })
  getFundingRatesForSymbol(@Param('symbol') symbol: string): Record<string, CcxtFundingRate> | null {
    return this.fundingRatesMonitorService.getFundingRatesForSymbol(symbol);
  }

  @Get('exchange/:exchangeId')
  @ApiOkResponse({
    description: 'Get funding rates for a specific exchange across all symbols',
    type: Object
  })
  getFundingRatesForExchange(@Param('exchangeId') exchangeId: string): Record<string, CcxtFundingRate> {
    return this.fundingRatesMonitorService.getFundingRatesForExchange(exchangeId);
  }

  @Get('symbols')
  @ApiOkResponse({
    description: 'Get all available symbols in the cache',
    type: [String]
  })
  getAvailableSymbols(): string[] {
    return this.fundingRatesMonitorService.getAvailableSymbols();
  }

  @Get('exchanges')
  @ApiOkResponse({
    description: 'Get all available exchanges being monitored',
    type: [String]
  })
  getAvailableExchanges(): string[] {
    return this.fundingRatesMonitorService.getAvailableExchanges();
  }

  @Get('stats')
  @ApiOkResponse({
    description: 'Get cache statistics',
    type: CacheStatsDto
  })
  getCacheStats(): CacheStatsDto {
    return this.fundingRatesMonitorService.getCacheStats();
  }

  @Post('update')
  @ApiOkResponse({
    description: 'Manually trigger a funding rates update',
    type: Object
  })
  async triggerUpdate(): Promise<{ message: string; timestamp: Date }> {
    this.logger.log('Manual funding rates update requested');
    await this.fundingRatesMonitorService.triggerUpdate();
    return {
      message: 'Funding rates update completed',
      timestamp: new Date()
    };
  }
}
