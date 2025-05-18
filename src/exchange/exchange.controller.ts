import { Controller, Get, Logger, Param } from '@nestjs/common';
import { PublicExchangeService } from './public-exchange.service';

@Controller('exchanges')
export class ExchangesController {
  constructor(private publicExchangeService: PublicExchangeService) {}

  private readonly logger = new Logger(ExchangesController.name);

  @Get(':exchangeId/markets')
  async getMarkets(@Param('exchangeId') exchangeId: string) {
    // const exchange = await this.exchangesService.getOrCreateExchange(exchangeId);
    // const marketsDictionary = exchange.markets as Dictionary<Market>;
    // return Object.values(marketsDictionary)
    //   .filter((m) => (m.active != undefined ? m.active : true))
    //   .map((m) => ({
    //     symbol: m.symbol,
    //     type: m.type,
    //     taker: m.taker,
    //     maker: m.maker
    //   }));
  }

  @Get(':exchangeId/required-credentials')
  getRequiredCredentials(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getRequiredCredentials(exchangeId);
  }
}
