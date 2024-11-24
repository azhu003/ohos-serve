import { HttpError } from './..';
import { HttpExchange } from '../http/HttpExchange';
import { HttpHandler } from './HttpHandler';

export abstract class BaseHandler implements HttpHandler {
  method: string

  constructor(method: string) {
    this.method = method
  }

  handle(exchange: HttpExchange): void {
    if (exchange.getRequestMethod() != this.method) {
      console.info(`reuqest  404: ${exchange.getRequestMethod()} ${exchange.originalUrl}`)
      exchange.writeError(HttpError.error(404))
      return
    }
    this.handler(exchange)
  }

  abstract handler(exchange: HttpExchange): void
}