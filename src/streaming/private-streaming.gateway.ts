import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { SubscriptionDto } from './dto/subscription.dto';
import { PrivateOrderbookService } from './private-orderbook.service';
import { PrivateTickerService } from './private-ticker.service';
import {
  EXCHANGE_PRIVATE_ORDERBOOK_UPDATE_EVENT,
  EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT,
  SOCKET_ORDERBOOK_EVENT,
  SOCKET_TICKER_EVENT
} from './streaming-events.constants';

interface AuthenticatedSocket extends Socket {
  user: {
    email: string;
    uid: string;
  };
}

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'private-streaming' })
export class PrivateStreamingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PrivateStreamingGateway.name);

  constructor(
    private readonly privateTickerService: PrivateTickerService,
    private readonly privateOrderbookService: PrivateOrderbookService,
    private readonly authService: AuthService
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: AuthenticatedSocket, next) => {
      // Accept token from headers
      const authHeader = socket.handshake.headers.authorization;
      const tokenHeader = socket.handshake.headers.token;
      let token: string | undefined;
      if (authHeader && typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
          token = authHeader;
        }
      } else if (tokenHeader && typeof tokenHeader === 'string') {
        token = tokenHeader;
      }
      if (!token) {
        return next(new Error('Authentication error: Missing token in headers.'));
      }
      try {
        const decodedToken = await this.authService.validateToken(token);
        if (!decodedToken) {
          return next(new Error('Authentication error: Invalid token.'));
        }
        socket.user = { email: decodedToken.email, uid: decodedToken.uid };
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected and authenticated: email: ${client.user.email} uid: ${client.user.uid}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.privateTickerService.handleClientDisconnect(client.id);
    this.privateOrderbookService.handleClientDisconnect(client.id);
  }

  @SubscribeMessage('subscribeToTickers')
  async handleSubscribe(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const { exchangeId, symbols } = subscriptionDto;
    const { uid: userId } = client.user;

    this.logger.log(`Client ${client.id} (user ${userId}) subscribing to ${exchangeId}: ${symbols.join(', ')}`);
    await this.privateTickerService.subscribe(client.id, exchangeId, userId, symbols);
    for (const symbol of symbols) {
      client.join(this.privateTickerService.getRoomName('ticker', 'private', exchangeId, symbol, userId));
    }
  }

  @SubscribeMessage('unsubscribeFromTickers')
  handleUnsubscribe(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ): void {
    const { exchangeId, symbols } = subscriptionDto;
    const { uid: userId } = client.user;

    this.logger.log(`Client ${client.id} (user ${userId}) unsubscribing from ${exchangeId}: ${symbols.join(', ')}`);
    this.privateTickerService.unsubscribe(client.id, exchangeId, userId, symbols);
    for (const symbol of symbols) {
      client.leave(this.privateTickerService.getRoomName('ticker', 'private', exchangeId, symbol, userId));
    }
  }

  @SubscribeMessage('subscribeToOrderbooks')
  async handleSubscribeOrderbooks(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const { exchangeId, symbols } = subscriptionDto;
    const { uid: userId } = client.user;
    this.logger.log(
      `Client ${client.id} (user ${userId}) subscribing to orderbooks ${exchangeId}: ${symbols.join(', ')}`
    );
    await this.privateOrderbookService.subscribe(client.id, exchangeId, userId, symbols);
    for (const symbol of symbols) {
      client.join(this.privateOrderbookService.getRoomName('orderbook', 'private', exchangeId, symbol, userId));
    }
  }

  @SubscribeMessage('unsubscribeFromOrderbooks')
  handleUnsubscribeOrderbooks(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ): void {
    const { exchangeId, symbols } = subscriptionDto;
    const { uid: userId } = client.user;
    this.logger.log(
      `Client ${client.id} (user ${userId}) unsubscribing from orderbooks ${exchangeId}: ${symbols.join(', ')}`
    );
    this.privateOrderbookService.unsubscribe(client.id, exchangeId, userId, symbols);
    for (const symbol of symbols) {
      client.leave(this.privateOrderbookService.getRoomName('orderbook', 'private', exchangeId, symbol, userId));
    }
  }

  @OnEvent(EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT)
  handleTickerUpdate(payload: any) {
    const room = this.privateTickerService.getRoomName(
      'ticker',
      'private',
      payload.exchangeId,
      payload.symbol,
      payload.userId
    );
    this.server.to(room).emit(SOCKET_TICKER_EVENT, payload);
  }

  @OnEvent(EXCHANGE_PRIVATE_ORDERBOOK_UPDATE_EVENT)
  handleOrderbookUpdate(payload: any) {
    const room = this.privateOrderbookService.getRoomName(
      'orderbook',
      'private',
      payload.exchangeId,
      payload.symbol,
      payload.userId
    );
    this.server.to(room).emit(SOCKET_ORDERBOOK_EVENT, payload);
  }
}
