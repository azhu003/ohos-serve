import { socket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { buffer, JSON } from '@kit.ArkTS';
import { ServeOptions } from './ServeOptions';
import { Parser } from '../http/Parser';
import { BufferPool } from '../http/BufferPool';
import { EventEmitter, getLogger, Logger } from '../utils';
import { HttpError, IncomingMessage, ServerResponse } from '../http';

const logger: Logger = getLogger('TCPService')
const DEFAULT_TIMEOUT: number = 10000
const DEFAULT_HOSTNAME: string = 'localhost'
const DEFAULT_PORT: number = 8080

export class Server extends EventEmitter {
  private socket: socket.TCPSocketServer = socket.constructTCPSocketServerInstance();
  private options: ServeOptions = {}

  async start(options: ServeOptions) {
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
    const extraOptions: socket.TCPExtraOptions = { socketTimeout: this.options.timeout || DEFAULT_TIMEOUT }
    await this.socket.setExtraOptions(extraOptions)
    this.socket.on("error", (error: BusinessError) => {
      logger.error(`on error, err: ${JSON.stringify(error)}`);
    })
    this.socket.on("connect", (conn) => {
      this.onConnect(this, conn)
    })
    logger.info(`tcp listened on ${this.options.hostname}:${this.options.port}`)
  }

  public listen(port?: number, host?: string): void {
    this.start({ hostname: host, port: port })
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
    request.pool.on("header-event", (data) => {
      try {
        Parser.parseHeader(data, request)
        if (request.isKeepLive) {
          response.setKeepLive()
        }
        response.request = request
        logger.info("--- header-event " + JSON.stringify(request.headers))
      } catch (e) {
        logger.info("--- header-event error: " + e.message)
        response.writeError(HttpError.error(500))
      }
    })
    request.pool.on("complete-event", () => {
      try {
        logger.info("--- complete-event -> Prepare to decode")
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
    connect.on('message', async (value: socket.SocketMessageInfo) => {
      try {
        const start = Date.now().valueOf()
        request.remote = value.remoteInfo
        request.pool.push(buffer.from(value.message), request)
        logger.info(`<<<--- receive message: process -> ${Date.now().valueOf() - start}ms`)
      } catch (e) {
        logger.info("--- message error: " + e?.message)
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