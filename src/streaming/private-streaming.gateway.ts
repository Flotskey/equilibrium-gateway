import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { PrivateTickerService } from './private-ticker.service';

interface AuthenticatedSocket extends Socket {
  user: {
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
    private readonly authService: AuthService
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token.'));
      }
      try {
        const decodedToken = await this.authService.validateToken(token);
        if (!decodedToken) {
          return next(new Error('Authentication error: Invalid token.'));
        }
        socket.user = { uid: decodedToken.uid };
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected and authenticated: ${client.id}, userId: ${client.user.uid}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.privateTickerService.handleClientDisconnect(client.id);
  }

  @SubscribeMessage('subscribeToTickers')
  async handleSubscribe(
    @MessageBody() subscriptionDto: SubscriptionDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const { exchangeId, symbols } = subscriptionDto;
    const { uid: userId } = client.user;

    this.logger.log(`Client ${client.id} (user ${userId}) subscribing to ${exchangeId}: ${symbols.join(', ')}`);
    await this.privateTickerService.subscribe(client.id, userId, exchangeId, symbols);
    for (const symbol of symbols) {
      client.join(this.getRoomName(userId, exchangeId, symbol));
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
    this.privateTickerService.unsubscribe(client.id, userId, exchangeId, symbols);
    for (const symbol of symbols) {
      client.leave(this.getRoomName(userId, exchangeId, symbol));
    }
  }

  // Note: The @OnEvent handler is now in the PublicStreamingGateway.
  // We need to decide how to route ticker events. For now, let's assume
  // the public gateway will broadcast all of them, but we can refine this.

  private getRoomName(userId: string, exchangeId: string, symbol: string): string {
    return `private:${userId}:${exchangeId}:${symbol}`;
  }
}
