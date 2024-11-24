import { HttpExchange, InetSocketAddress } from '.';
import { HttpServerImpl } from './impl';

export interface HttpServer {
  bind(addr: InetSocketAddress): HttpServer

  start(): Promise<boolean>

  stop(): Promise<void>

  restart(): Promise<boolean>

  post(path: string, callback: (exchange: HttpExchange) => void): HttpServer

  get(path: string, callback: (exchange: HttpExchange) => void): HttpServer

  removeContext(path: string): void

  getAddress(): InetSocketAddress
}

export function createHttpServer(): HttpServer {
  return new HttpServerImpl()
}