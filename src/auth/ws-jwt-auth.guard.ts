import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class WebSocketJwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const authHeader = client.handshake.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await this.authService.validateToken(token);
    if (!decodedToken) {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
    // Attach user info (user_id, email, etc) to the socket
    client.user = {
      userId: decodedToken.uid,
      email: decodedToken.email,
      ...decodedToken
    };
    return true;
  }
}
