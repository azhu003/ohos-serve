import { socket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { buffer, JSON } from '@kit.ArkTS';
import { ServeOptions } from './ServeOptions';
import { BufferPool } from '../http/BufferPool';
import { EventEmitter, getLogger, Logger } from '../utils';
import { HttpError, IncomingMessage, ServerResponse } from '../http';
import { SubscribeEvent } from './SubscribeEvent';

const logger: Logger = getLogger('TCPService')
const DEFAULT_TIMEOUT: number = 10000
const DEFAULT_HOSTNAME: string = 'localhost'
const DEFAULT_PORT: number = 8080

export class Server extends EventEmitter {
  private socket: socket.TCPSocketServer = socket.constructTCPSocketServerInstance();
  private options: ServeOptions = {}
  private subscribe: SubscribeEvent | undefined

  constructor(subscribe: SubscribeEvent | undefined) {
    super()
    this.subscribe = subscribe
  }

  async start(options: ServeOptions): Promise<boolean> {
    try {
      this.options = {
        hostname: options.hostname || DEFAULT_HOSTNAME,
        port: options.port || DEFAULT_PORT,
        timeout: options.timeout || DEFAULT_TIMEOUT
      }
      const address: socket.NetAddress = {
        address: this.options.hostname || DEFAULT_HOSTNAME,
        port: this.options.port || DEFAULT_PORT
      }
      await this.socket.listen(address)
      const extraOptions: socket.TCPExtraOptions = {
        keepAlive: true,
        socketTimeout: this.options.timeout || DEFAULT_TIMEOUT
      }
      await this.socket.setExtraOptions(extraOptions)
      this.socket.on("error", (error: BusinessError) => {
        logger.error(`on error, err: ${JSON.stringify(error)}`);
      })
      this.socket.on("connect", (conn) => {
        this.onConnect(this, conn)
      })
      logger.info(`tcp listened on ${this.options.hostname}:${this.options.port}`)
      return true
    } catch (e) {
      logger.error(`tcp start error ${e.message}`)
      return false
    }
  }

  public listen(port?: number, host?: string): Promise<boolean> {
    return this.start({ hostname: host, port: port })
  }

  stop() {
    this.socket.off("connect", (connect: socket.TCPSocketConnection) => {
      logger.info("取消连接 ->> " + connect.clientId)
    })
  }

  private onConnect(server: Server, connect: socket.TCPSocketConnection) {
    logger.info("--- connect client id: " + connect.clientId)
    const request: IncomingMessage = new IncomingMessage(new BufferPool(IncomingMessage.BUFSIZE))
    const response: ServerResponse = new ServerResponse(connect)
    this.subscribe?.onConnect(request, response)
    request.on("header-event", () => {
      try {
        // logger.info("--- header-event " + JSON.stringify([...request.headers]))
        this.subscribe?.onHeader(request, response)
        // server.emit('request', request, response)
      } catch (e) {
        logger.info("--- header-event error: " + e.message)
        response.writeError(HttpError.error(500))
      }
    })
    request.on("data", (chunk: buffer.Buffer) => {
      try {
        // server.emit('request', request, response)
        this.subscribe?.onData(request, response, chunk)
      } catch (e) {
        logger.info("--- header-event error: " + e.message)
        response.writeError(HttpError.error(500))
      }
    })
    request.on("complete-event", () => {
      try {
        // logger.info("--- complete-event -> Prepare to decode")
        request.parseBody()
          .then(() => {
            server.emit('request', request, response)
          })
          .catch((error: Error) => {
            logger.info("--- complete-event -> emit('request'): " + error?.message)
            response.writeError(HttpError.error(500))
          })
      } catch (e) {
        logger.info("--- complete-event error: " + e.message)
        response.writeError(HttpError.error(500))
      }
    })
    connect.on('message', (value: socket.SocketMessageInfo) => {
      try {
        const start = Date.now().valueOf()
        request.remote = value.remoteInfo
        request.pool.push(buffer.from(value.message), request, response)
        logger.info(`<<<--- receive message: ${request.getContentType()} length: ${value.message.byteLength} process -> ${Date.now()
          .valueOf() - start}ms`)
      } catch (e) {
        logger.info(`--- message error: ${e?.message} stack: ${e?.stack}`)
        response.writeError(HttpError.error(500))
      }
    })
    connect.on('close', () => {
      logger.info(`--- close connection #${connect.clientId}`)
      request.reset()
      request.pool.removeAllListeners()
      response.clear()
    })
  }
}