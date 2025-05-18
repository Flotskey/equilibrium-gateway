import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import ccxt, { Exchange } from 'ccxt';
import { ExchangeCredentialsDto } from './dto/exchange-credentials.dto';
import { SessionStore } from 'src/session-store/session-store.interface';

@Injectable()
export class PrivateExchangeService {
  constructor(@Inject('SessionStore') private readonly sessionStore: SessionStore<Exchange>) {}

  async createPrivateConnection(sessionId: string, exchangeId: string, creds: ExchangeCredentialsDto) {
    const exchange = new ccxt[exchangeId.toLowerCase()](creds);
    await this.sessionStore.set(sessionId, exchange);
  }

  async deletePrivateConnection(sessionId: string): Promise<void> {
    await this.sessionStore.delete(sessionId);
  }

  async getBalances(sessionId: string) {
    const exchange = this.getExchange(sessionId);
    if (!exchange) throw new UnauthorizedException('Invalid or expired session');
    return (await exchange).fetchBalance();
  }

  private async getExchange(sessionId: string): Promise<Exchange> {
    const exchange = await this.sessionStore.get(sessionId);
    if (!exchange) throw new UnauthorizedException('Invalid or expired session');
    return exchange;
  }
}
