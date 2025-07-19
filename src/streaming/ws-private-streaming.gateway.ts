import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketJwtAuthGuard } from '../auth/ws-jwt-auth.guard';
import { WatchBalanceDto } from './dto/watch-balance.dto';
import { WatchMyTradesDto } from './dto/watch-my-trades.dto';
import { WatchOrderBookDto } from './dto/watch-orderbook.dto';
import { WatchOrderBooksDto } from './dto/watch-orderbooks.dto';
import { WatchOrdersDto } from './dto/watch-orders.dto';
import { WatchPositionsDto } from './dto/watch-positions.dto';
import { WatchTickerDto } from './dto/watch-ticker.dto';
import { WatchTickersDto } from './dto/watch-tickers.dto';
import {
  BALANCE_UPDATE_EVENT,
  MY_TRADES_UPDATE_EVENT,
  ORDERBOOK_UPDATE_EVENT,
  ORDERBOOKS_UPDATE_EVENT,
  ORDERS_UPDATE_EVENT,
  POSITIONS_UPDATE_EVENT,
  SOCKET_BALANCE_EVENT,
  SOCKET_MY_TRADES_EVENT,
  SOCKET_ORDERBOOK_EVENT,
  SOCKET_ORDERBOOKS_EVENT,
  SOCKET_ORDERS_EVENT,
  SOCKET_POSITIONS_EVENT,
  SOCKET_TICKER_EVENT,
  SOCKET_TICKERS_EVENT,
  TICKER_UPDATE_EVENT,
  TICKERS_UPDATE_EVENT
} from './streaming-events.constants';
import { WsPrivateBalanceService } from './ws-private-balance.service';
import { WsPrivateOrderbookService } from './ws-private-orderbook.service';
import { WsPrivateOrdersService } from './ws-private-orders.service';
import { WsPrivatePositionsService } from './ws-private-positions.service';
import { WsPrivateTickerService } from './ws-private-ticker.service';
import { WsPrivateTradesService } from './ws-private-trades.service';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'private-streaming' })
@UseGuards(WebSocketJwtAuthGuard)
export class WsPrivateStreamingGateway {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(WsPrivateStreamingGateway.name);

  constructor(
    private readonly tickerService: WsPrivateTickerService,
    private readonly orderbookService: WsPrivateOrderbookService,
    private readonly balanceService: WsPrivateBalanceService,
    private readonly ordersService: WsPrivateOrdersService,
    private readonly tradesService: WsPrivateTradesService,
    private readonly positionsService: WsPrivatePositionsService
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

  @OnEvent(BALANCE_UPDATE_EVENT)
  handleBalanceUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_BALANCE_EVENT, data);
  }

  @OnEvent(ORDERS_UPDATE_EVENT)
  handleOrdersUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_ORDERS_EVENT, data);
  }

  @OnEvent(MY_TRADES_UPDATE_EVENT)
  handleMyTradesUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_MY_TRADES_EVENT, data);
  }

  @OnEvent(POSITIONS_UPDATE_EVENT)
  handlePositionsUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_POSITIONS_EVENT, data);
  }

  // --- Ticker ---
  @SubscribeMessage('watchTicker')
  async handleWatchTicker(@MessageBody() dto: WatchTickerDto, @ConnectedSocket() client: Socket & { user: any }) {
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
  async handleUnwatchTicker(@MessageBody() dto: WatchTickerDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.unWatchTicker(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchTicker)`);
  }
  @SubscribeMessage('watchTickers')
  async handleWatchTickers(@MessageBody() dto: WatchTickersDto, @ConnectedSocket() client: Socket & { user: any }) {
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
  async handleUnwatchTickers(@MessageBody() dto: WatchTickersDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tickerService.unWatchTickers(client.id, client.user.userId, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchTickers)`);
  }

  // --- Orderbook ---
  @SubscribeMessage('watchOrderBook')
  async handleWatchOrderBook(@MessageBody() dto: WatchOrderBookDto, @ConnectedSocket() client: Socket & { user: any }) {
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
  async handleUnwatchOrderBook(
    @MessageBody() dto: WatchOrderBookDto,
    @ConnectedSocket() client: Socket & { user: any }
  ) {
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
    @MessageBody() dto: WatchOrderBooksDto,
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
    @MessageBody() dto: WatchOrderBooksDto,
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

  // --- Balance ---
  @SubscribeMessage('watchBalance')
  async handleWatchBalance(@MessageBody() dto: WatchBalanceDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.balanceService.watchBalance(client.id, client.user.userId, dto.exchangeId);
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchBalance)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchBalance) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchBalance')
  async handleUnwatchBalance(@MessageBody() dto: WatchBalanceDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.balanceService.unWatchBalance(client.id, client.user.userId, dto.exchangeId);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchBalance)`);
  }

  // --- Orders ---
  @SubscribeMessage('watchOrders')
  async handleWatchOrders(@MessageBody() dto: WatchOrdersDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.ordersService.watchOrders(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchOrders)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchOrders) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchOrders')
  async handleUnwatchOrders(@MessageBody() dto: WatchOrdersDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.ordersService.unWatchOrders(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchOrders)`);
  }

  // --- My Trades ---
  @SubscribeMessage('watchMyTrades')
  async handleWatchMyTrades(@MessageBody() dto: WatchMyTradesDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.tradesService.watchMyTrades(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchMyTrades)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchMyTrades) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchMyTrades')
  async handleUnwatchMyTrades(@MessageBody() dto: WatchMyTradesDto, @ConnectedSocket() client: Socket & { user: any }) {
    const room = await this.tradesService.unWatchMyTrades(client.id, client.user.userId, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchMyTrades)`);
  }

  // --- Positions ---
  @SubscribeMessage('watchPositions')
  async handleWatchPositions(@MessageBody() dto: WatchPositionsDto, @ConnectedSocket() client: Socket & { user: any }) {
    const { room, started } = await this.positionsService.watchPositions(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} (user ${client.user.userId}) joined room ${room} (watchPositions)`);
    } else {
      client.emit('error', { message: 'No private exchange instance found. Please call createConnection first.' });
      this.logger.warn(
        `Client ${client.id} (user ${client.user.userId}) could not join room ${room} (watchPositions) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchPositions')
  async handleUnwatchPositions(
    @MessageBody() dto: WatchPositionsDto,
    @ConnectedSocket() client: Socket & { user: any }
  ) {
    const room = await this.positionsService.unWatchPositions(
      client.id,
      client.user.userId,
      dto.exchangeId,
      dto.symbol
    );
    client.leave(room);
    this.logger.log(`Client ${client.id} (user ${client.user.userId}) left room ${room} (unWatchPositions)`);
  }
}
