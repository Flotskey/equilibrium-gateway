import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ExchangeModule } from 'src/exchange/exchange.module';
import { PrivateOrderbookService } from './private-orderbook.service';
import { PrivateStreamingGateway } from './private-streaming.gateway';
import { PrivateTickerService } from './private-ticker.service';
import { PublicOrderbookService } from './public-orderbook.service';
import { PublicStreamingGateway } from './public-streaming.gateway';
import { PublicTickerService } from './public-ticker.service';

@Module({
  imports: [AuthModule, ExchangeModule],
  providers: [
    PublicStreamingGateway,
    PrivateStreamingGateway,
    PublicTickerService,
    PrivateTickerService,
    PublicOrderbookService,
    PrivateOrderbookService
  ]
})
export class StreamingModule {}
