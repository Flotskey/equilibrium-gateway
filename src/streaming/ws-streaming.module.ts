import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ExchangeModule } from '../exchange/exchange.module';
import { WsOhlcvService } from './ws-ohlcv.service';
import { WsOrderbookService } from './ws-orderbook.service';
import { WsPrivateBalanceService } from './ws-private-balance.service';
import { WsPrivateOrderbookService } from './ws-private-orderbook.service';
import { WsPrivateOrdersService } from './ws-private-orders.service';
import { WsPrivatePositionsService } from './ws-private-positions.service';
import { WsPrivateStreamingGateway } from './ws-private-streaming.gateway';
import { WsPrivateTickerService } from './ws-private-ticker.service';
import { WsPrivateTradesService } from './ws-private-trades.service';
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
    WsPrivateBalanceService,
    WsPrivateOrdersService,
    WsPrivateTradesService,
    WsPrivatePositionsService,
    AuthService,
    WsOhlcvService
  ]
})
export class WsStreamingModule {}
