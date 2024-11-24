import { BaseHandler } from './BaseHandler';
import { HttpExchange } from '../http/HttpExchange';

export class GetHandler extends BaseHandler {
  call: (exchange: HttpExchange) => void

  constructor(call: (exchange: HttpExchange) => void) {
    super('GET')
    this.call = call
  }

  handler(exchange: HttpExchange): void {
    this.call(exchange)
  }
}