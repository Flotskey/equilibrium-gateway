import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    credentials: ExchangeCredentialsDto
  ): Promise<ExchangeWrapper> {
    const key = this.getSessionKey(userId, exchangeId);
    let exchangeWrapper = await this.sessionStore.get(key);

    if (!exchangeWrapper) {
      // Validate credentials before creating exchange instance
      await this.validateCredentials(exchangeId, credentials);

      exchangeWrapper = this.exchangeFactory.create(exchangeId, credentials);
      await exchangeWrapper.exchange.loadMarkets();
      await this.sessionStore.set(key, exchangeWrapper);
    }

    return exchangeWrapper;
  }

  private async validateCredentials(exchangeId: string, credentials: ExchangeCredentialsDto): Promise<void> {
    // Create a temporary exchange instance to get required credentials
    const tempExchange = this.exchangeFactory.create(exchangeId, credentials);

    try {
      const requiredCredentials = tempExchange.exchange.requiredCredentials;

      if (requiredCredentials) {
        // Check for missing required credentials
        const missingCredentials = Object.keys(requiredCredentials)
          .filter((cred) => requiredCredentials[cred])
          .filter((cred) => !credentials[cred] || credentials[cred] === '');

        if (missingCredentials.length > 0) {
          throw new BadRequestException(
            `Missing required credentials for exchange ${exchangeId}: ${missingCredentials.join(', ')}`
          );
        }
      }
    } finally {
      // Explicitly close the temporary exchange to clean up any resources
      if (typeof tempExchange.close === 'function') {
        try {
          await tempExchange.close();
        } catch (err) {
          // Ignore cleanup errors for temporary instances
        }
      }
    }
  }

  private async getExchangeWrapper(userId: string, exchangeId: string): Promise<ExchangeWrapper | undefined> {
    return this.sessionStore.get(this.getSessionKey(userId, exchangeId));
  }

  async createConnection(dto: CreateConnectionDto): Promise<void> {
    const exchangeWrapper = await this.getOrCreateExchange(dto.userId, dto.exchangeId, dto.credentials);

    // Test the connection by fetching the balance
    try {
      await exchangeWrapper.exchange.fetchBalance();
    } catch (error) {
      // If balance fetch fails, remove the exchange instance and re-throw
      await this.sessionStore.delete(this.getSessionKey(dto.userId, dto.exchangeId));
      throw new BadRequestException(`Failed to connect to exchange ${dto.exchangeId}: ${error.message}`);
    }
  }

  async removeConnection(dto: RemoveConnectionDto): Promise<void> {
    const key = this.getSessionKey(dto.userId, dto.exchangeId);
    const exchange = await this.sessionStore.get(key);

    if (exchange && typeof exchange.close === 'function') {
      try {
        await exchange.close();
      } catch (error) {
        // Log error but don't fail the removal
        console.error(`Error closing exchange connection: ${error.message}`);
      }
    }

    await this.sessionStore.delete(key);
  }

  async createOrder(dto: CreateOrderDto): Promise<CcxtOrder> {
    const { userId, exchangeId, symbol, type, side, amount, price, params } = dto;

    // Validate required parameters
    if (!symbol || !type || !side || !amount) {
      throw new BadRequestException('Missing required parameters: symbol, type, side, and amount are required');
    }

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
    }

    return await exchangeWrapper.createOrder(symbol, type, side, amount, price, params);
  }

  async editOrder(dto: EditOrderDto): Promise<CcxtOrder> {
    const { userId, exchangeId, id, symbol, type, side, amount, price, params } = dto;

    // Validate required parameters
    if (!id || !symbol || !type || !side || !amount) {
      throw new BadRequestException('Missing required parameters: id, symbol, type, side, and amount are required');
    }

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
    }

    return await exchangeWrapper.editOrder(String(id), symbol, type, side, amount, price, params);
  }

  async createOrders(dto: CreateOrdersDto): Promise<CcxtOrder[]> {
    const { userId, exchangeId, orders } = dto;

    // Validate required parameters
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      throw new BadRequestException('Orders array is required and must not be empty');
    }

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
    }

    if (!exchangeWrapper.has['createOrders']) {
      throw new BadRequestException(`The exchange '${exchangeId}' does not support batch order creation.`);
    }

    return await exchangeWrapper.createOrders(orders);
  }

  async cancelOrder(dto: CancelOrderDto): Promise<Record<string, any>> {
    const { userId, exchangeId, id, symbol, params } = dto;

    // Validate required parameters
    if (!id) {
      throw new BadRequestException('Order ID is required');
    }

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
    }

    return exchangeWrapper.cancelOrder(String(id), symbol, params);
  }

  async fetchOrders(dto: FetchOrdersDto): Promise<CcxtOrder[]> {
    const { userId, exchangeId, symbol, params } = dto;

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
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

    // Validate required parameters
    if (!symbol) {
      throw new BadRequestException('Symbol is required');
    }

    const exchangeWrapper = await this.getExchangeWrapper(userId, exchangeId);

    if (!exchangeWrapper) {
      throw new NotFoundException(
        `Exchange instance not found for user ${userId} and exchange ${exchangeId}. Please call createConnection first.`
      );
    }

    if (!exchangeWrapper.exchange.has['fetchMyTrades']) {
      throw new BadRequestException(`The exchange '${exchangeId}' does not support fetching trades.`);
    }

    return (await exchangeWrapper.exchange.fetchMyTrades(symbol, since, limit, params)) as unknown as CcxtTrade[];
  }
}
