import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PrivateExchangeService } from './exchange/private-exchange.service';
import { PublicExchangeService } from './exchange/public-exchange.service';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, ExchangeModule, FirebaseModule],
  controllers: [],
  providers: [PrivateExchangeService, PublicExchangeService]
})
export class AppModule {}
