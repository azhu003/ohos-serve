import { HttpContext } from "../HttpContext";
import { HttpHandler } from "../../handler";
import { HttpServer } from "../HttpServer";

export class HttpContextImpl implements  HttpContext {
  private handler?: HttpHandler
  private attributes?: Map<string, object>
  private path: string
  private server: HttpServer

  constructor(path: string, server: HttpServer) {
    this.server = server
    this.path = path
  }

  setHandler(handler?: HttpHandler): void {
    this.handler = handler
  }

  getHandler(): HttpHandler | undefined {
    return this.handler
  }

  getPath(): string {
    return this.path
  }

  getServer(): HttpServer {
    return this.server
  }

  getAttributes(): Map<string, object> {
    return this.attributes || new Map()
  }
}