import { Module } from '@nestjs/common';
import { InMemorySessionStore } from 'src/session-store/in-memory-session-store.service';
import { PrivateExchangeController } from './private-exchange.controller';
import { PrivateExchangeService } from './private-exchange.service';
import { PublicExchangeController } from './public-exchange.controller';
import { PublicExchangeService } from './public-exchange.service';

@Module({
  imports: [],
  controllers: [PublicExchangeController, PrivateExchangeController],
  providers: [
    PublicExchangeService,
    PrivateExchangeService,
    {
      provide: 'PublicSessionStore',
      useFactory: () => new InMemorySessionStore()
    },
    {
      provide: 'PrivateSessionStore',
      useFactory: () => new InMemorySessionStore(10 * 60 * 1000) // 10 minutes
    }
  ],
  exports: ['PublicSessionStore', 'PrivateSessionStore']
})
export class ExchangeModule {}
