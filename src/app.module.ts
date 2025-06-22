import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PrivateExchangeService } from './exchange/private-exchange.service';
import { PublicExchangeService } from './exchange/public-exchange.service';
import { FirebaseModule } from './firebase/firebase.module';
import { StreamingEventsModule } from './streaming/streaming-events.module';
import { StreamingModule } from './streaming/streaming.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ExchangeModule,
    FirebaseModule,
    StreamingModule,
    StreamingEventsModule
  ],
  controllers: [],
  providers: [PrivateExchangeService, PublicExchangeService]
})
export class AppModule {}
