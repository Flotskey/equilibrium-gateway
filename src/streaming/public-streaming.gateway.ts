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
import { PrivateStreamingGateway } from './private-streaming.gateway';
import { PublicTickerService } from './public-ticker.service';
import { EXCHANGE_TICKER_UPDATE_EVENT, SOCKET_TICKER_EVENT } from './streaming-events.constants';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'streaming' })
export class PublicStreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PublicStreamingGateway.name);

  constructor(
    private readonly publicTickerService: PublicTickerService,
    private readonly privateGateway: PrivateStreamingGateway
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.publicTickerService.handleClientDisconnect(client.id);
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
      client.join(this.getPublicRoomName(exchangeId, symbol));
    }
  }

  @SubscribeMessage('unsubscribeFromTickers')
  handleUnsubscribe(@MessageBody() subscriptionDto: SubscriptionDto, @ConnectedSocket() client: Socket): void {
    const { exchangeId, symbols } = subscriptionDto;
    this.logger.log(`Client ${client.id} unsubscribing from ${exchangeId}: ${symbols.join(', ')}`);
    this.publicTickerService.unsubscribe(client.id, exchangeId, symbols);
    for (const symbol of symbols) {
      client.leave(this.getPublicRoomName(exchangeId, symbol));
    }
  }

  @OnEvent(EXCHANGE_TICKER_UPDATE_EVENT)
  handleTickerUpdate(payload: any) {
    if (payload.isPrivate) {
      const room = this.getPrivateRoomName(payload.userId, payload.exchangeId, payload.symbol);
      this.privateGateway.server.to(room).emit(SOCKET_TICKER_EVENT, payload);
    } else {
      const room = this.getPublicRoomName(payload.exchangeId, payload.symbol);
      this.server.to(room).emit(SOCKET_TICKER_EVENT, payload);
    }
  }

  private getPublicRoomName(exchangeId: string, symbol: string): string {
    return `${exchangeId}:${symbol}`;
  }

  private getPrivateRoomName(userId: string, exchangeId: string, symbol: string): string {
    return `private:${userId}:${exchangeId}:${symbol}`;
  }
}
