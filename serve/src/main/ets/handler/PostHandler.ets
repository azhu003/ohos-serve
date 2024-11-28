import { BaseHandler } from './BaseHandler';
import { HttpExchange } from '../http/HttpExchange';

export class PostHandler extends BaseHandler {
  constructor(handler: (exchange: HttpExchange) => void) {
    super('POST', handler)
  }
}