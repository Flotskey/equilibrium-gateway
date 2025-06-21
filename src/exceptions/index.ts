import { HttpException, HttpStatus } from '@nestjs/common';

class AuthException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

class InvalidTokenException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

class MissingRequiredTokenException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

class UnknownExchangeNameException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

class UnsupportedApiException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_IMPLEMENTED);
  }
}

class BrokenExchangeException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

class MissingEnvironmentVariableException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export {
  AuthException,
  InvalidTokenException,
  MissingRequiredTokenException,
  UnknownExchangeNameException,
  UnsupportedApiException,
  BrokenExchangeException,
  MissingEnvironmentVariableException
};
