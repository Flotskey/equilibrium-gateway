import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { Exchange } from 'ccxt';
import { GatewayOrder } from 'src/models/gateway-order.model';
import { SessionStore } from 'src/session-store/session-store.interface';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { ExchangeCredentialsDto } from './dto/exchange-credentials.dto';
import { toGatewayOrder } from './order.mapper';

@Injectable()
export class PrivateExchangeService {
  /**
   * sessionKey: `${userId}:${exchangeId}` -> ccxt Exchange
   */
  constructor(
    @Inject('PrivateSessionStore')
    private readonly sessionStore: SessionStore<Exchange>
  ) {}

  private getSessionKey(userId: string, exchangeId: string): string {
    return `${userId}:${exchangeId}`;
  }

  private async getOrCreateExchange(
    userId: string,
    exchangeId: string,
    creds: ExchangeCredentialsDto
  ): Promise<Exchange> {
    const key = this.getSessionKey(userId, exchangeId);
    let exchange = await this.sessionStore.get(key);

    if (!exchange) {
      exchange = new ccxt[exchangeId.toLowerCase()]({
        ...creds,
        enableRateLimit: true
      });
      await exchange.loadMarkets();
      await this.sessionStore.set(key, exchange);
    }

    return exchange;
  }

  private async getExchange(userId: string, exchangeId: string): Promise<Exchange | undefined> {
    return this.sessionStore.get(this.getSessionKey(userId, exchangeId));
  }

  private async removeExchange(userId: string, exchangeId: string): Promise<void> {
    const key = this.getSessionKey(userId, exchangeId);
    const exchange = await this.sessionStore.get(key);

    if (exchange && typeof exchange.close === 'function') {
      await exchange.close();
    }

    await this.sessionStore.delete(key);
  }

  async createOrder(dto: CreateOrderDto): Promise<GatewayOrder> {
    const { userId, exchangeId, symbol, type, side, amount, price, params } = dto;

    const exchange = await this.getExchange(userId, exchangeId);

    if (!exchange) {
      throw new Error('Exchange instance not found for user');
    }

    const ccxtOrder = await exchange.createOrder(symbol, type, side, amount, price, params);
    return toGatewayOrder(ccxtOrder);
  }

  async editOrder(dto: EditOrderDto): Promise<GatewayOrder> {
    let { userId, exchangeId, id, symbol, type, side, amount, price, params } = dto;

    id = String(id);

    const exchange = await this.getExchange(userId, exchangeId);

    if (!exchange) {
      throw new Error('Exchange instance not found for user');
    }

    const ccxtOrder = await exchange.editOrder(id, symbol, type, side, amount, price, params);
    return toGatewayOrder(ccxtOrder);
  }

  async createOrders(dto: CreateOrdersDto): Promise<GatewayOrder[]> {
    const { userId, exchangeId, orders } = dto;
    const exchange = await this.getExchange(userId, exchangeId);

    if (!exchange) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    if (!exchange.has['createOrders']) {
      throw new BadRequestException(`The exchange '${exchangeId}' does not support batch order creation.`);
    }

    const ccxtOrders = await exchange.createOrders(orders);
    return ccxtOrders.map(toGatewayOrder);
  }

  async cancelOrder(dto: CancelOrderDto): Promise<Record<string, any>> {
    let { userId, exchangeId, id, symbol, params } = dto;

    id = String(id);

    const exchange = await this.getExchange(userId, exchangeId);

    if (!exchange) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    return exchange.cancelOrder(id, symbol, params);
  }
}
