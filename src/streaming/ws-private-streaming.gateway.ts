import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketJwtAuthGuard } from '../auth/ws-jwt-auth.guard';
import { StreamingDto } from './dto/streaming.dto';
import { WsPrivateOrderbookService } from './ws-private-orderbook.service';
import { WsPrivateTickerService } from './ws-private-ticker.service';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'private-streaming' })
@UseGuards(WebSocketJwtAuthGuard)
export class WsPrivateStreamingGateway {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(WsPrivateStreamingGateway.name);

  constructor(
    private readonly tickerService: WsPrivateTickerService,
    private readonly orderbookService: WsPrivateOrderbookService
  ) {}

  // --- Ticker ---
  @SubscribeMessage('watchTicker')
  async handleWatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.watchTicker(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.join(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchTicker)`);
  }
  @SubscribeMessage('unWatchTicker')
  async handleUnwatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.unWatchTicker(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchTicker)`);
  }
  @SubscribeMessage('watchTickers')
  async handleWatchTickers(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.watchTickers(client.id, client.user.userId, dto.exchangeId, dto.symbols);
    client.join(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchTickers)`);
  }
  @SubscribeMessage('unWatchTickers')
  async handleUnwatchTickers(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.unWatchTickers(client.id, client.user.userId, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchTickers)`);
  }

  // --- Orderbook ---
  @SubscribeMessage('watchOrderBook')
  async handleWatchOrderBook(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.orderbookService.watchOrderBook(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.join(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchOrderBook)`);
  }
  @SubscribeMessage('unWatchOrderBook')
  async handleUnwatchOrderBook(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.orderbookService.unWatchOrderBook(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchOrderBook)`);
  }
  @SubscribeMessage('watchOrderBookForSymbols')
  async handleWatchOrderBookForSymbols(
    @MessageBody() dto: StreamingDto,
    @ConnectedSocket() client: Socket & { user: any }
  ) {
    const room = await this.orderbookService.watchOrderBookForSymbols(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbols
    );
    client.join(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchOrderBookForSymbols)`);
  }
  @SubscribeMessage('unWatchOrderBookForSymbols')
  async handleUnwatchOrderBookForSymbols(
    @MessageBody() dto: StreamingDto,
    @ConnectedSocket() client: Socket & { user: any }
  ) {
    const room = await this.orderbookService.unWatchOrderBookForSymbols(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbols
    );
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchOrderBookForSymbols)`);
  }
}
