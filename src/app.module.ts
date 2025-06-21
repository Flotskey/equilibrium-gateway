import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExchangeModule } from './exchange/exchange.module';
import { PrivateExchangeService } from './exchange/private-exchange.service';
import { PublicExchangeService } from './exchange/public-exchange.service';
import { InMemorySessionStore } from './session-store/in-memory-session-store.service';

@Module({
  imports: [ExchangeModule, ConfigModule.forRoot({ isGlobal: true })],
  controllers: [],
  providers: [
    PrivateExchangeService,
    PublicExchangeService,
    { provide: 'SessionStore', useClass: InMemorySessionStore }
  ] // for Redis implement RedisSessionStore and use -> { provide: 'SessionStore', useClass: RedisSessionStore }
})
export class AppModule {}
