import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CcxtOrder, CcxtTrade } from 'src/models/ccxt';
import { SessionStore } from 'src/session-store/session-store.interface';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { ExchangeCredentialsDto } from './dto/exchange-credentials.dto';
import { FetchOrdersDto } from './dto/fetch-orders.dto';
import { FetchTradesDto } from './dto/fetch-trades.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { ExchangeFactory } from './exchange.factory';
import { ExchangeWrapper } from './wrappers/exchange-wrapper.interface';

@Injectable()
export class PrivateExchangeService {
  /**
   * sessionKey: `${userId}:${exchangeId}` -> ExchangeWrapper
   */
  constructor(
    @Inject('PrivateSessionStore')
    private readonly sessionStore: SessionStore<ExchangeWrapper>,
    private readonly exchangeFactory: ExchangeFactory
  ) {}

  private getSessionKey(userId: string, exchangeId: string): string {
    return `${userId}:${exchangeId}`;
  }

  private async getOrCreateExchange(
    userId: string,
    exchangeId: string,
    creds: ExchangeCredentialsDto
  ): Promise<ExchangeWrapper> {
    const key = this.getSessionKey(userId, exchangeId);
    let exchangeWrapper = await this.sessionStore.get(key);

    if (!exchangeWrapper) {
      exchangeWrapper = this.exchangeFactory.create(exchangeId, creds);
      await exchangeWrapper.exchange.loadMarkets();
      await this.sessionStore.set(key, exchangeWrapper);
    }

    return exchangeWrapper;
  }

  private async getExchangeWrapper(userId: string, exchangeId: string): Promise<ExchangeWrapper | undefined> {
    return this.sessionStore.get(this.getSessionKey(userId, exchangeId));
  }

  async createConnection(dto: CreateConnectionDto): Promise<void> {
    const exchangeWrapper = await this.getOrCreateExchange(dto.userId, dto.exchangeId, dto.credentials);
    // test the connection by fetching the balance
    await exchangeWrapper.exchange.fetchBalance();
  }

  async removeConnection(dto: RemoveConnectionDto): Promise<void> {
    const key = this.getSessionKey(dto.userId, dto.exchangeId);
    const exchange = await this.sessionStore.get(key);

    if (exchange && typeof exchange.close === 'function') {
      await exchange.close();
    }

    await this.sessionStore.delete(key);
  }

  async createOrder(dto: CreateOrderDto): Promise<CcxtOrder> {
    const { userId, exchangeId, symbol, type, side, amount, price, params } = dto;

    const exchange = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchange) {
      throw new Error('Exchange instance not found for user');
    }

    return await exchange.createOrder(symbol, type, side, amount, price, params);
  }

  async editOrder(dto: EditOrderDto): Promise<CcxtOrder> {
    let { userId, exchangeId, id, symbol, type, side, amount, price, params } = dto;

    id = String(id);

    const exchange = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchange) {
      throw new Error('Exchange instance not found for user');
    }

    return await exchange.editOrder(id, symbol, type, side, amount, price, params);
  }

  async createOrders(dto: CreateOrdersDto): Promise<CcxtOrder[]> {
    const { userId, exchangeId, orders } = dto;
    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    if (!exchangeWrapper.has['createOrders']) {
      throw new BadRequestException(`The exchange '${exchangeId}' does not support batch order creation.`);
    }

    return await exchangeWrapper.createOrders(orders);
  }

  async cancelOrder(dto: CancelOrderDto): Promise<Record<string, any>> {
    let { userId, exchangeId, id, symbol, params } = dto;

    id = String(id);

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    return exchangeWrapper.cancelOrder(id, symbol, params);
  }

  async fetchOrders(dto: FetchOrdersDto): Promise<CcxtOrder[]> {
    const { userId, exchangeId, symbol, params } = dto;

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    // Check if exchange supports fetchOrders, fallback to fetchClosedOrders if not
    if (exchangeWrapper.exchange.has['fetchOrders']) {
      return (await exchangeWrapper.exchange.fetchOrders(
        symbol,
        undefined,
        undefined,
        params
      )) as unknown as CcxtOrder[];
    } else if (exchangeWrapper.exchange.has['fetchClosedOrders']) {
      return (await exchangeWrapper.exchange.fetchClosedOrders(
        symbol,
        undefined,
        undefined,
        params
      )) as unknown as CcxtOrder[];
    } else {
      throw new BadRequestException(`The exchange '${exchangeId}' does not support fetching orders.`);
    }
  }

  async fetchTrades(dto: FetchTradesDto): Promise<CcxtTrade[]> {
    const { userId, exchangeId, symbol, since, limit, params } = dto;

    const exchange = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchange) {
      throw new Error(`Exchange instance not found for user ${userId}`);
    }

    return (await exchange.exchange.fetchMyTrades(symbol, since, limit, params)) as unknown as CcxtTrade[];
  }
}
