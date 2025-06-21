import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { API_KEY_MAP } from './api-key-map';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];
    const userId = API_KEY_MAP[apiKey];
    if (!apiKey || !userId) {
      throw new UnauthorizedException('Invalid or missing API Key');
    }
    req.userId = userId; // Attach for downstream
    return true;
  }
}
