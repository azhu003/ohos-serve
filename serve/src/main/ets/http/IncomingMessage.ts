import { buffer } from '@kit.ArkTS'
import { socket } from '@kit.NetworkKit'
import { ContentType } from '.'
import { Parser } from './Parser'
import { BufferPool } from './BufferPool'

export class IncomingMessage {
  public static HTTP_VERSION: string = 'HTTP/1.1';

  // 缓冲区大小
  static BUFSIZE: number = (1024 * 1024);
  remote: socket.SocketRemoteInfo
  pool: BufferPool

  protocol: string = 'HTTP/1.1'
  method: string = ''
  url: string = '/'
  originalUrl: string = ''
  headers: Map<string, string> = new Map()
  queryParameters: Map<string, string> = new Map()
  form: Map<string, string[]> = new Map()
  body: object
  fileParams: Map<string, string[]>;
  files: Map<string, buffer.Buffer>;

  isKeepLive: boolean

  constructor(pool: BufferPool) {
    this.pool = pool
  }

  getContentLength(): number {
    return this.headers['content-length'] || 0
  }

  getContentType(): string {
    return this.headers['content-type'] || ''
  }

  parseBody(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.method === 'POST') {
          // 获取请求头中的content-type
          let contentType: ContentType = new ContentType(this.headers['content-type']);
          // 如果content-type是multipart，解析multipart/form-data格式的数据
          if (contentType.isMultipart()) {
            this.fileParams = new Map<string, string[]>()
            Parser.parseMultipartFormData(contentType, this.pool, this.fileParams, this.files)
          } else {
            // 创建一个buffer来存储请求体数据
            let bodyBuffer: buffer.Buffer = buffer.allocUninitializedFromPool(this.pool.writeStart - this.pool.headEnd);
            this.pool.buffer.copy(bodyBuffer, 0, this.pool.headEnd, this.pool.writeStart);
            // 如果content-type是application/x-www-form-urlencoded，解析表单数据
            if (contentType.getContentType() === ContentType.APPLICATION_FORM_URLENCODED) {
              Parser.parseFormData(bodyBuffer, this.form)
            } else if (contentType.getContentType() === ContentType.APPLICATION_JSON) {
              this.body = Parser.parseJson(bodyBuffer)
            } else if (contentType.getContentType() === ContentType.APPLICATION_STREAM) {

            }
          }
        }
        this.pool.reset() //body解析完成后随即释放
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  reset() {
    this.pool.reset()
    this.headers?.clear()
    this.fileParams?.clear()
    this.files?.clear()
    this.queryParameters?.clear()
  }
}