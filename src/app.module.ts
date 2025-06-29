import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PrivateExchangeService } from './exchange/private-exchange.service';
import { PublicExchangeService } from './exchange/public-exchange.service';
import { FirebaseModule } from './firebase/firebase.module';
import { WsStreamingModule } from './streaming/ws-streaming.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    AuthModule,
    ExchangeModule,
    FirebaseModule,
    WsStreamingModule
  ],
  controllers: [],
  providers: [PrivateExchangeService, PublicExchangeService]
})
export class AppModule {}
