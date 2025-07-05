import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ExchangeModule } from '../exchange/exchange.module';
import { WsOhlcvService } from './ws-ohlcv.service';
import { WsOrderbookService } from './ws-orderbook.service';
import { WsPrivateOrderbookService } from './ws-private-orderbook.service';
import { WsPrivateStreamingGateway } from './ws-private-streaming.gateway';
import { WsPrivateTickerService } from './ws-private-ticker.service';
import { WsStreamingGateway } from './ws-streaming.gateway';
import { WsTickerService } from './ws-ticker.service';

@Module({
  imports: [ExchangeModule],
  providers: [
    WsStreamingGateway,
    WsOrderbookService,
    WsTickerService,
    WsPrivateStreamingGateway,
    WsPrivateTickerService,
    WsPrivateOrderbookService,
    AuthService,
    WsOhlcvService
  ]
})
export class WsStreamingModule {}
