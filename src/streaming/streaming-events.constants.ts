// Backend event for public ticker updates
export const EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT = 'exchange.public.ticker.update';

// Backend event for private ticker updates
export const EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT = 'exchange.private.ticker.update';

// Client event: emitted to clients via Socket.IO for both public and private tickers
export const SOCKET_TICKER_EVENT = 'ticker';

// Backend event for public orderbook updates
export const EXCHANGE_PUBLIC_ORDERBOOK_UPDATE_EVENT = 'exchange.public.orderbook.update';

// Backend event for private orderbook updates
export const EXCHANGE_PRIVATE_ORDERBOOK_UPDATE_EVENT = 'exchange.private.orderbook.update';

// Client event: emitted to clients via Socket.IO for both public and private orderbooks
export const SOCKET_ORDERBOOK_EVENT = 'orderbook';
