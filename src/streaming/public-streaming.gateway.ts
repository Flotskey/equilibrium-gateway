import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SubscriptionDto } from './dto/subscription.dto';
import { PublicOrderbookService } from './public-orderbook.service';
import { PublicTickerService } from './public-ticker.service';
import {
  EXCHANGE_PUBLIC_ORDERBOOK_UPDATE_EVENT,
  EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT,
  SOCKET_ORDERBOOK_EVENT,
  SOCKET_TICKER_EVENT
} from './streaming-events.constants';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'streaming' })
export class PublicStreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PublicStreamingGateway.name);

  constructor(
    private readonly publicTickerService: PublicTickerService,
    private readonly publicOrderbookService: PublicOrderbookService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.publicTickerService.handleClientDisconnect(client.id);
    this.publicOrderbookService.handleClientDisconnect(client.id);
  }

  @SubscribeMessage('subscribeToTickers')
  async handleSubscribe(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { exchangeId, symbols } = subscriptionDto;
    this.logger.log(`Client ${client.id} subscribing to ${exchangeId}: ${symbols.join(', ')}`);
    await this.publicTickerService.subscribe(client.id, exchangeId, symbols);
    for (const symbol of symbols) {
      client.join(this.publicTickerService.getRoomName('ticker', 'public', exchangeId, symbol));
    }
  }

  @SubscribeMessage('unsubscribeFromTickers')
  handleUnsubscribe(@MessageBody() subscriptionDto: SubscriptionDto, @ConnectedSocket() client: Socket): void {
    const { exchangeId, symbols } = subscriptionDto;
    this.logger.log(`Client ${client.id} unsubscribing from ${exchangeId}: ${symbols.join(', ')}`);
    this.publicTickerService.unsubscribe(client.id, exchangeId, symbols);
    for (const symbol of symbols) {
      client.leave(this.publicTickerService.getRoomName('ticker', 'public', exchangeId, symbol));
    }
  }

  @SubscribeMessage('subscribeToOrderbooks')
  async handleSubscribeOrderbooks(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { exchangeId, symbols } = subscriptionDto;
    this.logger.log(`Client ${client.id} subscribing to orderbooks ${exchangeId}: ${symbols.join(', ')}`);
    await this.publicOrderbookService.subscribe(client.id, exchangeId, symbols);
    for (const symbol of symbols) {
      client.join(this.publicOrderbookService.getRoomName('orderbook', 'public', exchangeId, symbol));
    }
  }

  @SubscribeMessage('unsubscribeFromOrderbooks')
  handleUnsubscribeOrderbooks(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: Socket
  ): void {
    const { exchangeId, symbols } = subscriptionDto;
    this.logger.log(`Client ${client.id} unsubscribing from orderbooks ${exchangeId}: ${symbols.join(', ')}`);
    this.publicOrderbookService.unsubscribe(client.id, exchangeId, symbols);
    for (const symbol of symbols) {
      client.leave(this.publicOrderbookService.getRoomName('orderbook', 'public', exchangeId, symbol));
    }
  }

  @OnEvent(EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT)
  handleTickerUpdate(payload: any) {
    const room = this.publicTickerService.getRoomName('ticker', 'public', payload.exchangeId, payload.symbol);
    this.server.to(room).emit(SOCKET_TICKER_EVENT, payload);
  }

  @OnEvent(EXCHANGE_PUBLIC_ORDERBOOK_UPDATE_EVENT)
  handleOrderbookUpdate(payload: any) {
    const room = this.publicOrderbookService.getRoomName('orderbook', 'public', payload.exchangeId, payload.symbol);
    this.server.to(room).emit(SOCKET_ORDERBOOK_EVENT, payload);
  }
}
