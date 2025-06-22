// Backend event for public ticker updates
export const EXCHANGE_PUBLIC_TICKER_UPDATE_EVENT = 'exchange.public.ticker.update';

// Backend event for private ticker updates
export const EXCHANGE_PRIVATE_TICKER_UPDATE_EVENT = 'exchange.private.ticker.update';

// Client event: emitted to clients via Socket.IO for both public and private tickers
export const SOCKET_TICKER_EVENT = 'ticker';
