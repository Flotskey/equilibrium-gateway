import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { InMemorySessionStore } from 'src/session-store/in-memory-session-store.service';
import { ExchangeInstanceService } from './exchange-instance.service';
import { CcxtExchangeFactory, ExchangeFactory } from './exchange.factory';
import { FundingRatesMonitorController } from './funding-rates-monitor.controller';
import { FundingRatesMonitorService } from './funding-rates-monitor.service';
import { PrivateExchangeController } from './private-exchange.controller';
import { PrivateExchangeService } from './private-exchange.service';
import { PublicExchangeController } from './public-exchange.controller';
import { PublicExchangeService } from './public-exchange.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicExchangeController, PrivateExchangeController, FundingRatesMonitorController],
  providers: [
    PublicExchangeService,
    PrivateExchangeService,
    FundingRatesMonitorService,
    {
      provide: ExchangeFactory,
      useClass: CcxtExchangeFactory
    },
    {
      provide: 'PublicSessionStore',
      useFactory: () => new InMemorySessionStore()
    },
    {
      provide: 'PrivateSessionStore',
      useFactory: () => new InMemorySessionStore(6)
    },
    ExchangeInstanceService
  ],
  exports: [
    'PublicSessionStore',
    'PrivateSessionStore',
    ExchangeFactory,
    ExchangeInstanceService,
    FundingRatesMonitorService
  ]
})
export class ExchangeModule {}
