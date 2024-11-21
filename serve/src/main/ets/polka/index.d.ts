import type { IncomingMessage, ServerResponse } from '../http';
import type { Methods, Trouter } from './trouter';
import type { Server } from '../service';
import { buffer } from '@kit.ArkTS';
import { SubscribeEvent } from '../service/SubscribeEvent';

export interface RequestHandler<T extends Request> {
  // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
  (
    req: T,
    res: ServerResponse,
    next: NextFunction,
  ): void;
}

export interface NextFunction {
  (err?: any): void;

  /**
   * "Break-out" of a router by calling {next('router')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
   */
  (deferToNext: "router"): void;

  /**
   * "Break-out" of a route by calling {next('route')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
   */
  (deferToNext: "route"): void;
}

interface Url {
  auth: string | null;
  hash: string | null;
  host: string | null;
  hostname: string | null;
  href: string;
  path: string | null;
  pathname: string | null;
  protocol: string | null;
  search: string | null;
  slashes: boolean | null;
  port: string | null;
  query: string | null;
}

/**
 * Calls the next middleware function in the chain, or throws an error.
 */
export type Next = (err?: string | Error) => void;

/**
 * An `http.IncomingMessage`, extended by Polka
 */
export interface Request extends IncomingMessage {
  /**
   * The originally-requested URL, including parent router segments.
   */
  originalUrl: string;

  /**
   * The path portion of the requested URL.
   */
  url: string;

  /**
   * The values of named parameters within your route pattern
   */
  params: {
    [key: string]: string;
  };

  /**
   * The un-parsed querystring
   */
  search: string | null;

  /**
   * The parsed querystring
   */
  query: {
    [key: string]: string | string[];
  };
}

/**
 * An instance of the Polka router.
 */
export interface Polka<T extends Request> extends Trouter {
  /**
   * Parses the `req.url` property of the given request.
   */
  parse(req: Request): Url;

  /**
   * Attach middleware(s) and/or sub-application(s) to the server.
   * These will execute before your routes' handlers.
   */

  /**
   * Attach middleware(s) and/or sub-application(s) to the server.
   * These will execute before your routes' handlers.
   */

  /**
   * Boots (or creates) the underlying `http.Server` for the first time.
   */
  // listen(port?: number, hostname?: string, listeningListener?: (message: string) => void): this;
  listen(port?: number, hostname?: string): Promise<boolean>;

  // listen(port?: number, listeningListener?: (message?: string) => void): this;

  /**
   * Boots (or creates) the underlying `http.Server` for the first time.
   * All arguments are passed to server.listen directly with no changes.
   */
  // listen(...args: unknown[]): this;

  /**
   * The main Polka `IncomingMessage` handler.
   * It receives all requests and tries to match the incoming URL against known routes.
   */
  handler(req: Request, res: ServerResponse, parsed?: Url): void;

  /**
   * The instantiated `server` Polka creates when `listen()` is called.
   * `server` is only created if a server was not provided via `option.server`
   * `server` will be undefined until polka.listen is invoked or if a server was provided.
   */
  server?: Server | undefined;

  add(method: Methods, pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  all(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  get(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  head(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  patch(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  options(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  connect(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  delete(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  trace(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  post(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;

  put(pattern: string | RegExp, ...handlers: RequestHandler<T>[]): this;
}

/**
 * Polka options
 */
export interface Options {
  /**
   * The server instance to use when `polka.listen()` is called.
   */
  server?: Server | undefined;

  /**
   * A catch-all error handler; executed whenever a middleware throws an error.
   */
  onError?(err: Error, req: Request, res: ServerResponse, next: Next): void;

  /**
   * A handler when no route definitions were matched.
   */
  onNoMatch?(req: Request, res: ServerResponse): void;

  subscriber?: SubscribeEvent | undefined
}

/**
 * Creates a Polka HTTP router.
 *
 * @see https://github.com/lukeed/polka
 */
export function polka<T extends Request>(opts?: Options): Polka<T>

// declare function polka<T extends Request>(opts?: Options): Polka<T>;

// export default polka;