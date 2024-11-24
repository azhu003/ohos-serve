import { buffer, JSON } from '@kit.ArkTS';
import { socket } from '@kit.NetworkKit';
import { HttpContext, HttpExchange, Headers, InetSocketAddress, HttpError, ServerResponse } from '../';

export class HttpExchangeImpl implements HttpExchange {
  private context?: HttpContext
  private attribute: Map<string, object> = new Map()
  public originalUrl: string = ''
  public protocol: string = 'HTTP/1.1'
  public method: string = ''
  public path: string = ''
  public query: Map<string, string> = new Map()
  public isEnd: boolean = false
  //Request
  private requestUri: string = ''
  private requestMethod: string = 'GET'
  private reqHeaders: Headers = new Headers()
  private reqBody?: buffer.Buffer
  private remote?: InetSocketAddress
  //Response
  private response: ServerResponse

  constructor(client: socket.TCPSocketConnection) {
    this.response = new ServerResponse(client, this)
  }

  setHttpContext(context: HttpContext) {
    this.context = context
  }

  setRequestMethod(method: string) {
    this.requestMethod = method
  }

  setRemoteAddress(remote: InetSocketAddress) {
    this.remote = remote
  }

  setRequestBody(body: buffer.Buffer | null) {
    this.reqBody = body || undefined
  }

  writeEnd() {
    this.isEnd = true
  }

  clear() {
    this.isEnd = false
    this.context = undefined
    this.attribute.clear()
    this.reqHeaders.clear()
    this.reqBody = undefined
    this.remote = undefined
    this.response?.clear()
  }

  // ================== 对外接口 ==================
  getRequestHeaders(): Headers {
    return this.reqHeaders
  }

  getRequestURI(): string {
    return this.requestUri
  }

  getRequestMethod(): string {
    return this.requestMethod
  }

  getQueryParams(name: string): string {
    return this.query.get(name) || ''
  }

  getHttpContext(): HttpContext | undefined {
    return this.context
  }

  /**
   * 设置响应报文类型
   * @param contentType-ContentType.TEXT_PLAIN,ContentType.TEXT_HTML,ContentType.APPLICATION_JSON等
   */
  setResponseContentType(contentType: string): HttpExchange {
    this.response.setContentType(contentType)
    return this
  }

  setKeepLive(): HttpExchange {
    this.response.setKeepLive()
    return this
  }

  setStatusCode(statusCode: number): HttpExchange {
    this.response.setStatusCode(statusCode)
    return this
  }

  writeJson(json: object): Promise<void> {
    return this.response.writeJson(json)
  }

  writeError(error: HttpError): Promise<void> {
    return this.response.writeError(error)
  }

  end(message: string | undefined): Promise<void> {
    return this.response.end(message)
  }

  getRequestBody(): buffer.Buffer {
    return this.reqBody || buffer.allocUninitializedFromPool(0)
  }

  getRequestStringBody(): string {
    return this.getRequestBody().toString()
  }

  getRequestJsonBody<T>(): T {
    return JSON.parse(this.getRequestStringBody()) as T
  }

  getRemoteAddress(): InetSocketAddress | undefined {
    return this.remote
  }

  getAttribute(name: string): object | undefined {
    return this.attribute.get(name)
  }

  setAttribute(name: string, value: object): void {
    this.attribute.set(name, value)
  }

  reset() {
    this.isEnd = false
    this.context = undefined
    this.attribute.clear()
    this.reqHeaders.clear()
    this.reqBody = undefined
    this.remote = undefined
  }

  // ================== 对外接口 ==================
}