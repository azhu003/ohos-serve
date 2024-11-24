import { HttpExchange } from "../http/HttpExchange";
import { HttpHandler } from "./HttpHandler";

export class DefaultHttpHandler implements  HttpHandler {

  handle(exchange: HttpExchange): void {
    exchange.end('HelloWorld')
  }
}