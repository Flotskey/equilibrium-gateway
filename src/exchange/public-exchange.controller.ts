import { Controller, Get, Logger, Param } from '@nestjs/common';
import { PublicExchangeService } from './public-exchange.service';

@Controller('exchanges/public/:exchangeId')
export class PublicExchangeController {
  constructor(private publicExchangeService: PublicExchangeService) {}

  private readonly logger = new Logger(PublicExchangeController.name);

  @Get('required-credentials')
  getRequiredCredentials(@Param('exchangeId') exchangeId: string) {
    return this.publicExchangeService.getRequiredCredentials(exchangeId);
  }
}
