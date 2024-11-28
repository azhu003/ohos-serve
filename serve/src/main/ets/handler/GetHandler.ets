import { BaseHandler } from './BaseHandler';
import { HttpExchange } from '../http/HttpExchange';

export class GetHandler extends BaseHandler {
  constructor(call: (exchange: HttpExchange) => void) {
    super('GET', call)
  }
}