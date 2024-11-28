import { HttpError } from './..';
import { HttpExchange } from '../http/HttpExchange';
import { HttpHandler } from './HttpHandler';

export abstract class BaseHandler implements HttpHandler {
  method: string
  handler: (exchange: HttpExchange) => void

  constructor(method: string, handler: (exchange: HttpExchange) => void) {
    this.method = method
    this.handler = handler
  }

  handle(exchange: HttpExchange) {
    if (exchange.getRequestMethod() != this.method) {
      console.info(`reuqest  404: ${exchange.getRequestMethod()} ${exchange.originalUrl}`)
      throw HttpError.error(404)
    }
    return this.handler(exchange)
  }
}