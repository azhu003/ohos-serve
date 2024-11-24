import { HttpHandler } from "../handler";
import { HttpServer } from "./HttpServer";

export interface HttpContext {

  setHandler(handler: HttpHandler): void

  getHandler(): HttpHandler | undefined;

  getPath(): string

  getServer(): HttpServer

  getAttributes(): Map<string, object>
}