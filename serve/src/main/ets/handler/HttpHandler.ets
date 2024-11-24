import { HttpExchange } from "../http/HttpExchange";

export interface HttpHandler {
  handle(exchange: HttpExchange): void
}