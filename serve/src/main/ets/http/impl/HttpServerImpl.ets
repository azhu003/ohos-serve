import { socket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { JSON } from '@kit.ArkTS';
import { HttpContext, HttpError, HttpExchange, HttpServer, InetSocketAddress } from '../';
import { HttpContextImpl, HttpExchangeImpl } from '../impl';
import { GetHandler, HttpHandler, PostHandler } from '../../handler';
import { BufferPool, Parser } from '../../decode';
import { getLogger, Logger, Objects } from '../../utils';

const logger: Logger = getLogger('HttpServerImpl')
const DEFAULT_HOSTNAME: string = '0.0.0.0'
const DEFAULT_PORT: number = 53317
const DEFAULT_CONNECT_TIMEOUT: number = 10000

export class HttpServerImpl implements HttpServer {
  private address: InetSocketAddress | undefined
  private handlers: Map<string, HttpHandler> = new Map()
  private socket: socket.TCPSocketServer = socket.constructTCPSocketServerInstance();
  private connectTimeout: number = DEFAULT_CONNECT_TIMEOUT

  setTimeout(milliseconds: number): HttpServer {
    this.connectTimeout = milliseconds
    return this
  }

  bind(addr: InetSocketAddress): HttpServer {
    this.address = addr;
    return this
  }

  async start(): Promise<boolean> {
    try {
      const address: socket.NetAddress = {
        address: this.address?.address || DEFAULT_HOSTNAME,
        port: this.address?.port || DEFAULT_PORT,
      }
      await this.socket.listen(address)
      const extraOptions: socket.TCPExtraOptions = {
        keepAlive: true,
        socketTimeout: this.connectTimeout,
        receiveBufferSize: 1024 * 1024,
      }
      await this.socket.setExtraOptions(extraOptions)
      this.socket.on("error", (error: BusinessError) => {
        logger.error(`on error, err: ${JSON.stringify(error)}`);
      })
      this.socket.on("connect", (conn: socket.TCPSocketConnection) => {
        this.onConnected(this, conn)
      })
      logger.info(`tcp listened on ${this.address?.address}:${this.address?.port}`)
      return true
    } catch (e) {
      logger.error(`tcp start error ${e.message}`)
      return false
    }
  }

  private onConnected(server: HttpServer, connect: socket.TCPSocketConnection) {
    logger.info("--- connect client id: " + connect.clientId)
    const exchange: HttpExchangeImpl = new HttpExchangeImpl(connect)
    const pool: BufferPool = new BufferPool(exchange, (header: string) => {
      try {
        Parser.parseHeader(header, exchange)
        const context: HttpContext = new HttpContextImpl(exchange.path, server)
        const handler = this.handlers?.get(exchange.path)
        if (!handler) {
          logger.info(`<<<--- ${exchange.getRequestMethod()} ${exchange.path} 404`)
          throw HttpError.error(404)
        } else {
          context.setHandler(handler)
          exchange.setHttpContext(context)
          handler.handle(exchange)
        }
      } catch (e) {
        logger.error(`--- parse header error: ${JSON.stringify(e)} message: ${e?.message} stack:\n${e?.stack}`)
        throw (e instanceof Error) ? e : HttpError.error(500)
      }
    })
    connect.on('message', (value: socket.SocketMessageInfo) => {
      try {
        exchange.setRemoteAddress(Objects.clone<InetSocketAddress, socket.SocketRemoteInfo>({} as InetSocketAddress, value.remoteInfo))
        // logger.info(`<<<--- receive message: length: ${value.message.byteLength}`)
        pool.push(value.message)
      } catch (e) {
        logger.info(`--- message error: ${e?.message} stack: ${e?.stack}`)
        if (e instanceof HttpError) {
          exchange.writeError(HttpError.error(e.status, e.message))
        } else {
          HttpError.error(500)
        }
      }
    })
    connect.on('close', () => {
      logger.info(`--- close connection #${connect.clientId}`)
      pool.reset()
      exchange.clear()
    })
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.socket.off("connect", (connect: socket.TCPSocketConnection) => {
        logger.info("取消连接 ->> " + connect.clientId)
      })
      resolve()
    })
  }

  restart(): Promise<boolean> {
    return this.stop()
      .then(() => {
        return this.start()
      })
  }

  post(path: string, callback: (exchange: HttpExchange) => void): HttpServer {
    this.handlers.set(path, new PostHandler(callback))
    return this
  }

  get(path: string, callback: (exchange: HttpExchange) => void): HttpServer {
    this.handlers.set(path, new GetHandler(callback))
    return this
  }

  removeContext(path: string) {
    this.handlers?.delete(path)
  }

  getAddress(): InetSocketAddress {
    if (!this.address) {
      throw Error('Please call the bind method first.')
    }
    return this.address
  }
}