import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketJwtAuthGuard } from '../auth/ws-jwt-auth.guard';
import { StreamingDto } from './dto/streaming.dto';
import {
  ORDERBOOK_UPDATE_EVENT,
  ORDERBOOKS_UPDATE_EVENT,
  SOCKET_ORDERBOOK_EVENT,
  SOCKET_ORDERBOOKS_EVENT,
  SOCKET_TICKER_EVENT,
  SOCKET_TICKERS_EVENT,
  TICKER_UPDATE_EVENT,
  TICKERS_UPDATE_EVENT
} from './streaming-events.constants';
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

  @OnEvent(TICKER_UPDATE_EVENT)
  handleTickerUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_TICKER_EVENT, data);
  }

  @OnEvent(TICKERS_UPDATE_EVENT)
  handleTickersUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_TICKERS_EVENT, data);
  }

  @OnEvent(ORDERBOOK_UPDATE_EVENT)
  handleOrderbookUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_ORDERBOOK_EVENT, data);
  }

  @OnEvent(ORDERBOOKS_UPDATE_EVENT)
  handleOrderbooksUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_ORDERBOOKS_EVENT, data);
  }

  // --- Ticker ---
  @SubscribeMessage('watchTicker')
  async handleWatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.tickerService.watchTicker(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchTicker)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchTicker) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchTicker')
  async handleUnwatchTicker(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.unWatchTicker(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchTicker)`);
  }
  @SubscribeMessage('watchTickers')
  async handleWatchTickers(@MessageBody() dto: StreamingDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.tickerService.watchTickers(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbols
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchTickers)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchTickers) - missing exchange instance`
      );
    }
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
    const { room, started } = await this.orderbookService.watchOrderBook(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchOrderBook)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchOrderBook) - missing exchange instance`
      );
    }
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
    const { room, started } = await this.orderbookService.watchOrderBookForSymbols(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbols
    );
    if (started) {
      client.join(room);
      this.logger.log(
        `Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchOrderBookForSymbols)`
      );
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchOrderBookForSymbols) - missing exchange instance`
      );
    }
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
