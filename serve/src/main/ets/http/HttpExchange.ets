import { Headers, HttpContext, HttpError, InetSocketAddress } from './'
import { buffer } from '@kit.ArkTS'

export interface HttpExchange {
  originalUrl: string
  protocol: string
  path: string
  query: Map<string, string>
  isEnd: boolean

  getRequestHeaders(): Headers

  getRequestURI(): string

  getRequestMethod(): string

  getQueryParams(name: string): string

  getHttpContext(): HttpContext | undefined

  setResponseContentType(contentType: string): HttpExchange

  setKeepLive(): HttpExchange

  setStatusCode(statusCode: number): HttpExchange

  writeJson(json: object): Promise<void>

  writeError(error: HttpError): Promise<void>

  end(message?: string | undefined): Promise<void>

  getRequestBody(): buffer.Buffer

  getRequestStringBody(): string

  getRequestJsonBody<T>(): T

  getRemoteAddress(): InetSocketAddress | undefined

  getAttribute(name: string): object | undefined

  setAttribute(name: string, value: object): void

  reset(): void
}