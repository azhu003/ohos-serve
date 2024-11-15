import { socket } from "@kit.NetworkKit";
import buffer from "@ohos.buffer";
import { JSON } from "@kit.ArkTS";
import { BusinessError } from "@kit.BasicServicesKit";
import { getLogger, Logger } from "../utils";
import { IncomingMessage, ContentType, HttpError } from ".";

const logger: Logger = getLogger('ServerResponse')

export class ServerResponse {
  client: socket.TCPSocketConnection

  statusCode: number = 200
  statusMessage: string = 'OK'
  finished: boolean = false
  request: IncomingMessage //用于请求结束后重置数据
  closed: boolean = false

  private _headers: Map<string, string> = new Map()
  private _body: buffer.Buffer
  private content_type: ContentType
  private content_length: number = 0
  public keep_alive: boolean;
  public send_date: boolean = true;
  private default_headers: string[]


  constructor(client: socket.TCPSocketConnection) {
    this.client = client
    this.default_headers = ['content-type', 'content-length', 'connection', 'date']
  }

  reset() {
    this._headers.clear()
    this._body = null
    this.content_type = null
    this.finished = false
    this.closed = false
    this.request.reset()
  }

  clear() {
    this.closed = true
    this.client = null
    this._headers.clear()
    this._headers = null
    this._body = null
    this.content_type = null
  }


  /**
   * 设置响应头
   *
   * @param name header中的name名称
   * @param name header中的name对应的value
   **/
  public setHeader(name: string, value: string | number | boolean | string[]): ServerResponse {
    this._headers.set(name.toLowerCase(), value as string);
    return this
  }

  /**
   * 设置响应头
   *
   * @param headers header整个对象
   **/
  public setHeaders(headers: Map<string, string>): ServerResponse {
    for (const key of headers.keys()) {
      this.setHeader(key.toLowerCase(), headers.get(key));
    }
    return this
  }

  /**
   * 设置响应报文类型
   * @param contentType-ContentType.TEXT_PLAIN,ContentType.TEXT_HTML,ContentType.APPLICATION_JSON等
   */
  public setContentType(contentType: string): ServerResponse {
    if (contentType) {
      this.content_type = new ContentType(contentType)
      this.setHeader('content-type', contentType)
    }
    return this
  }

  public setKeepLive(): ServerResponse {
    this.keep_alive = true
    return this
  }

  setStatusCode(statusCode: number): ServerResponse {
    this.statusCode = statusCode
    return this
  }

  writeJson(json: object): Promise<void> {
    this.content_type = new ContentType(ContentType.APPLICATION_JSON)
    this._body = buffer.from(JSON.stringify(json))
    return this._end()
  }

  writeError(error: HttpError): Promise<void> {
    this.statusCode = error.status
    this.statusMessage = error.message
    return this._end()
  }

  end(message: string | undefined) {
    if (message) {
      this._body = buffer.from(message)
    }
    this._end()
  }

  write(body: buffer.Buffer | string | undefined): Promise<void> {
    if (typeof body == "string") {
      this._body = buffer.from(body)
    } else {
      this._body = body
    }
    return this._end()
  }

  private _end(): Promise<void> {
    this.finished = true
    //客户端主动关闭连接后，不再继续往下执行
    if (this.closed) {
      return
    }
    this.content_length = this._body?.length || 0
    const header: buffer.Buffer = buffer.from(this.getFinalHeaderMessage());
    const body: buffer.Buffer = this._body
    const options: socket.TCPSendOptions = {
      data: buffer.concat([header, body]).buffer
    }
    return new Promise<void>((resolve, reject) => {
      this.client.send(options)
        .then(() => {
          this.reset()
          return new Promise((res, rej) => {
            if (this.keep_alive) {
              res(undefined)
            } else {
              this.client.close()
                .then(() => {
                  res(undefined)
                })
                .catch(() => {
                  logger.info("断开连接失败 -> ")
                  rej()
                })
            }
          })
        })
        .then(() => {
          resolve()
        })
        .catch((err: BusinessError) => {
          reject(err)
        })
    })
  }

  private getFinalHeaderMessage(): string {
    let headers: string = `HTTP/1.1 ${this.statusCode} ${this.statusMessage}\r\n`;
    if (!this.content_type) {
      this.content_type = new ContentType(ContentType.TEXT_PLAIN)
    }
    headers = this.printfHeader(headers, 'Content-Type', this.content_type.getContentType());
    headers = this.printfHeader(headers, 'Content-Length', this.content_length);
    if (this.keep_alive) {
      headers = this.printfHeader(headers, 'Connection', 'keep-alive');
    }
    if (this.send_date) {
      headers = this.printfHeader(headers, 'Date', new Date().toUTCString());
    }
    // for (let cookieHeader of this.cookieHeaders) {
    //   resData = this.printfHeader(resData, 'Set-Cookie', cookieHeader);
    // }
    this._headers?.forEach((value, key) => {
      if (!this.default_headers.includes(key)) {
        headers = this.printfHeader(headers, key, value);
      }
    });
    headers += '\r\n';
    return headers
  }

  /**
   * 向outHeader中追加header信息
   *
   * @param originHeader起源标头
   * @param header中key值
   * @param header中value值
   * @return 响应头字符串输出
   **/
  private printfHeader(originHeader: string, name: string, value: string | number | boolean): string {
    let tempOriginHeader: string = originHeader
    const key = name.replaceAll(/[^a-zA-Z-]/g, '').toLowerCase()
    tempOriginHeader += `${key}: ${value}\r\n`
    if (!['set-cookie'].includes(key)) {
      this.setHeader(key, value);
    }
    return tempOriginHeader;
  }
}