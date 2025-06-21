import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import ccxt from 'ccxt';
import { Response } from 'express';
import {
  AuthException,
  BrokenExchangeException,
  UnknownExchangeNameException,
  UnsupportedApiException
} from './exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.getResponse() : String(exception);

    if (exception instanceof ccxt.AuthenticationError) {
      response.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (
      exception instanceof ccxt.InvalidNonce ||
      exception instanceof AuthException // covers your token-related exceptions
    ) {
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (exception instanceof ccxt.OrderNotFound || exception instanceof UnknownExchangeNameException) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (exception instanceof ccxt.InvalidOrder || exception instanceof ccxt.InsufficientFunds) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (exception instanceof ccxt.NotSupported || exception instanceof UnsupportedApiException) {
      response.status(HttpStatus.NOT_IMPLEMENTED).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (exception instanceof BrokenExchangeException) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else if (exception instanceof ccxt.NetworkError) {
      response.status(HttpStatus.GATEWAY_TIMEOUT).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
    }
  }
}
