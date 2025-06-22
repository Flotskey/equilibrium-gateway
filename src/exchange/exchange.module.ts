import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { InMemorySessionStore } from 'src/session-store/in-memory-session-store.service';
import { CcxtExchangeFactory, ExchangeFactory } from './exchange.factory';
import { PrivateExchangeController } from './private-exchange.controller';
import { PrivateExchangeService } from './private-exchange.service';
import { PublicExchangeController } from './public-exchange.controller';
import { PublicExchangeService } from './public-exchange.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicExchangeController, PrivateExchangeController],
  providers: [
    PublicExchangeService,
    PrivateExchangeService,
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
      useFactory: () => new InMemorySessionStore(20)
    }
  ],
  exports: ['PublicSessionStore', 'PrivateSessionStore', ExchangeFactory]
})
export class ExchangeModule {}
