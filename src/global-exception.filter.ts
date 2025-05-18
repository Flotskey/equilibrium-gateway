import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import ccxt from "ccxt";
import { AuthException, UnknownExchangeNameException, UnsupportedApiException, BrokenExchangeException } from "./exceptions";
import {  Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof ccxt.AuthenticationError) {
      res.status(HttpStatus.UNAUTHORIZED).send();
    } else if (
      exception instanceof ccxt.InvalidNonce ||
      exception instanceof AuthException // covers your token-related exceptions
    ) {
      res.status(HttpStatus.FORBIDDEN).send();
    } else if (
      exception instanceof ccxt.OrderNotFound ||
      exception instanceof UnknownExchangeNameException
    ) {
      res.status(HttpStatus.NOT_FOUND).send();
    } else if (
      exception instanceof ccxt.InvalidOrder ||
      exception instanceof ccxt.InsufficientFunds
    ) {
      res.status(HttpStatus.BAD_REQUEST).send();
    } else if (
      exception instanceof ccxt.NotSupported ||
      exception instanceof UnsupportedApiException
    ) {
      res.status(HttpStatus.NOT_IMPLEMENTED).send();
    } else if (exception instanceof BrokenExchangeException) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).send();
    } else if (exception instanceof ccxt.NetworkError) {
      res.status(HttpStatus.GATEWAY_TIMEOUT).send();
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }
}