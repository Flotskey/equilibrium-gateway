import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WatchOhlcvDto } from './dto/watch-ohlcv.dto';
import { WatchOrderBookDto } from './dto/watch-orderbook.dto';
import { WatchOrderBooksDto } from './dto/watch-orderbooks.dto';
import { WatchTickerDto } from './dto/watch-ticker.dto';
import { WatchTickersDto } from './dto/watch-tickers.dto';
import {
  OHLCV_UPDATE_EVENT,
  ORDERBOOK_UPDATE_EVENT,
  ORDERBOOKS_UPDATE_EVENT,
  SOCKET_OHLCV_EVENT,
  SOCKET_ORDERBOOK_EVENT,
  SOCKET_ORDERBOOKS_EVENT,
  SOCKET_TICKER_EVENT,
  SOCKET_TICKERS_EVENT,
  TICKER_UPDATE_EVENT,
  TICKERS_UPDATE_EVENT
} from './streaming-events.constants';
import { WsOhlcvService } from './ws-ohlcv.service';
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
    private readonly orderbookService: WsOrderbookService,
    private readonly ohlcvService: WsOhlcvService
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

  @OnEvent(OHLCV_UPDATE_EVENT)
  handleOhlcvUpdate({ room, data }: { room: string; data: any }) {
    this.server.to(room).emit(SOCKET_OHLCV_EVENT, data);
  }

  // --- Ticker ---
  @SubscribeMessage('watchTicker')
  async handleWatchTicker(@MessageBody() dto: WatchTickerDto, @ConnectedSocket() client: Socket) {
    const { room, started } = await this.tickerService.watchTicker(client.id, dto.exchangeId, dto.symbol);
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room} (watchTicker)`);
    } else {
      client.emit('error', { message: 'No public exchange instance found.' });
      this.logger.warn(`Client ${client.id} could not join room ${room} (watchTicker) - missing exchange instance`);
    }
  }
  @SubscribeMessage('unWatchTicker')
  async handleUnwatchTicker(@MessageBody() dto: WatchTickerDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.unWatchTicker(client.id, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchTicker)`);
  }
  @SubscribeMessage('watchTickers')
  async handleWatchTickers(@MessageBody() dto: WatchTickersDto, @ConnectedSocket() client: Socket) {
    const { room, started } = await this.tickerService.watchTickers(client.id, dto.exchangeId, dto.symbols);
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room} (watchTickers)`);
    } else {
      client.emit('error', { message: 'No public exchange instance found.' });
      this.logger.warn(`Client ${client.id} could not join room ${room} (watchTickers) - missing exchange instance`);
    }
  }
  @SubscribeMessage('unWatchTickers')
  async handleUnwatchTickers(@MessageBody() dto: WatchTickersDto, @ConnectedSocket() client: Socket) {
    const room = await this.tickerService.unWatchTickers(client.id, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchTickers)`);
  }

  // --- Orderbook ---
  @SubscribeMessage('watchOrderBook')
  async handleWatchOrderBook(@MessageBody() dto: WatchOrderBookDto, @ConnectedSocket() client: Socket) {
    const { room, started } = await this.orderbookService.watchOrderBook(client.id, dto.exchangeId, dto.symbol);
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room} (watchOrderBook)`);
    } else {
      client.emit('error', { message: 'No public exchange instance found.' });
      this.logger.warn(`Client ${client.id} could not join room ${room} (watchOrderBook) - missing exchange instance`);
    }
  }
  @SubscribeMessage('unWatchOrderBook')
  async handleUnwatchOrderBook(@MessageBody() dto: WatchOrderBookDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.unWatchOrderBook(client.id, dto.exchangeId, dto.symbol);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchOrderBook)`);
  }
  @SubscribeMessage('watchOrderBookForSymbols')
  async handleWatchOrderBookForSymbols(@MessageBody() dto: WatchOrderBooksDto, @ConnectedSocket() client: Socket) {
    const { room, started } = await this.orderbookService.watchOrderBookForSymbols(
      client.id,
      dto.exchangeId,
      dto.symbols
    );
    if (started) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room} (watchOrderBookForSymbols)`);
    } else {
      client.emit('error', { message: 'No public exchange instance found.' });
      this.logger.warn(
        `Client ${client.id} could not join room ${room} (watchOrderBookForSymbols) - missing exchange instance`
      );
    }
  }
  @SubscribeMessage('unWatchOrderBookForSymbols')
  async handleUnwatchOrderBookForSymbols(@MessageBody() dto: WatchOrderBooksDto, @ConnectedSocket() client: Socket) {
    const room = await this.orderbookService.unWatchOrderBookForSymbols(client.id, dto.exchangeId, dto.symbols);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room} (unWatchOrderBookForSymbols)`);
  }

  @SubscribeMessage('watchOhlcv')
  async handleWatchOhlcv(@MessageBody() dto: WatchOhlcvDto, @ConnectedSocket() client: Socket) {
    const { room, started } = await this.ohlcvService.watchOhlcv(client.id, dto.exchangeId, dto.symbol, dto.timeframe);
    const clientRoom = `${room}:${client.id}:${dto.timeframe}`;
    if (started) {
      client.join(clientRoom);
      this.logger.log(`Client ${client.id} joined room ${clientRoom} (watchOhlcv)`);
    } else {
      client.emit('error', { message: 'No public exchange instance found.' });
      this.logger.warn(
        `Client ${client.id} could not join room ${clientRoom} (watchOhlcv) - missing exchange instance`
      );
    }
  }

  @SubscribeMessage('unWatchOhlcv')
  async handleUnwatchOhlcv(@MessageBody() dto: WatchOhlcvDto, @ConnectedSocket() client: Socket) {
    const room = await this.ohlcvService.unWatchOhlcv(client.id, dto.exchangeId, dto.symbol, dto.timeframe);
    const clientRoom = `${room}:${client.id}:${dto.timeframe}`;
    client.leave(clientRoom);
    this.logger.log(`Client ${client.id} left room ${clientRoom} (unWatchOhlcv)`);
  }
}
