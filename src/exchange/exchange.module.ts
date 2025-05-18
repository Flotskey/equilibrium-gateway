import { ExchangesController } from './exchange.controller';
import { Module } from '@nestjs/common';
import { PublicExchangeService } from './public-exchange.service';
import { PrivateExchangeService } from './private-exchange.service';
import { InMemorySessionStore } from 'src/session-store/in-memory-session-store.service';

@Module({
  imports: [],
  controllers: [ExchangesController],
  providers: [
    PublicExchangeService,
    PrivateExchangeService,
    {
      provide: 'SessionStore',
      useClass: InMemorySessionStore
    }
  ]
})
export class ExchangeModule {}
