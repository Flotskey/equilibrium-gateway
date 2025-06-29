import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamingDto } from './dto/streaming.dto';
import {
  SOCKET_TICKER_EVENT,
  SOCKET_TICKERS_EVENT,
  TICKER_UPDATE_EVENT,
  TICKERS_UPDATE_EVENT
} from './streaming-events.constants';
import { WsOrderbookService } from './ws-orderbook.service';
import { WsTickerService } from './ws-ticker.service';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'streaming' })
export class WsStreamingGateway {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(WsStreamingGateway.name);

  constructor(
    private readonly tickerService: WsTickerService,
    private readonly orderbookService: WsOrderbookService
  ) {}

  @OnEvent(TICKER_UPDATE_EVENT)
  handleTickerUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_TICKER_EVENT, data);
  }

  @OnEvent(TICKERS_UPDATE_EVENT)
  handleTickersUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_TICKERS_EVENT, data);
  }

  // --- Ticker ---
  @SubscribeMessage('watchTicker')
  async handleWatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.watchTicker(client.id, dto.exchangeId, dto.symbol);
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room} (watchTicker)`);
  }
  @SubscribeMessage('unWatchTicker')
  async handleUnwatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.unWatchTicker(client.id, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchTicker)`);
  }
  @SubscribeMessage('watchTickers')
  async handleWatchTickers(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.watchTickers(client.id, dto.exchangeId, dto.symbols);
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room} (watchTickers)`);
  }
  @SubscribeMessage('unWatchTickers')
  async handleUnwatchTickers(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.unWatchTickers(client.id, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchTickers)`);
  }

  // --- Orderbook ---
  @SubscribeMessage('watchOrderBook')
  async handleWatchOrderBook(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.watchOrderBook(client.id, dto.exchangeId, dto.symbol);
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room} (watchOrderBook)`);
  }
  @SubscribeMessage('unWatchOrderBook')
  async handleUnwatchOrderBook(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.unWatchOrderBook(client.id, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchOrderBook)`);
  }
  @SubscribeMessage('watchOrderBookForSymbols')
  async handleWatchOrderBookForSymbols(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.watchOrderBookForSymbols(client.id, dto.exchangeId, dto.symbols);
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room} (watchOrderBookForSymbols)`);
  }
  @SubscribeMessage('unWatchOrderBookForSymbols')
  async handleUnwatchOrderBookForSymbols(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.unWatchOrderBookForSymbols(client.id, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchOrderBookForSymbols)`);
  }
}
