import { Order as CcxtOrder } from 'ccxt';
import { GatewayOrder } from '../models/gateway-order.model';

export const toGatewayOrder = (order: CcxtOrder): GatewayOrder => {
  if (!order) {
    return null;
  }

  const gatewayOrder = new GatewayOrder();
  gatewayOrder.id = order.id;
  gatewayOrder.clientOrderId = order.clientOrderId;
  gatewayOrder.datetime = order.datetime;
  gatewayOrder.timestamp = order.timestamp;
  gatewayOrder.status = order.status;
  gatewayOrder.symbol = order.symbol;
  gatewayOrder.type = order.type;
  gatewayOrder.side = order.side;
  gatewayOrder.price = order.price;
  gatewayOrder.amount = order.amount;
  gatewayOrder.filled = order.filled;
  gatewayOrder.remaining = order.remaining;
  gatewayOrder.cost = order.cost;
  gatewayOrder.fee = order.fee
    ? {
        currency: order.fee.currency,
        cost: order.fee.cost,
        rate: order.fee.rate
      }
    : undefined;

  return gatewayOrder;
};
