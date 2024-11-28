import { ArkTSUtils, buffer, Queue } from '@kit.ArkTS';
import { buf2String, getLogger } from '../utils';
import { HttpExchangeImpl } from '../http/impl';

const number2 = 2;
const number3 = 3;
const number4 = 4;

const BUFSIZE: number = (1024 * 1024);
const logger = getLogger('BufferPool')

export class BufferPool {
  private expandSize: number = 1024 * 1024 //每次扩容的长度
  buffer: buffer.Buffer | null
  length: number = 0 //数据长度
  readPos: number = 0 //开始读取位置
  writeStart: number = 0 //写入位置
  headEnd: number = 0 //请求头结束位置

  isSegmented: boolean = false
  exchange: HttpExchangeImpl
  onHeader: (headers: string) => void
  streams: Queue<ArrayBuffer> = new Queue()
  isPushing: boolean = false
  private lock_: ArkTSUtils.locks.AsyncLock = new ArkTSUtils.locks.AsyncLock();
  index: number = 0

  constructor(exchange: HttpExchangeImpl, onHeader: (headers: string) => void) {
    this.buffer = buffer.alloc(BUFSIZE)
    this.exchange = exchange
    this.onHeader = onHeader
  }

  async push(buf: ArrayBuffer) {
    if (!this.buffer) {
      return
    }
    if (this.isPushing) {
      this.streams.add(buf)
      logger.debug(`--- 阻塞 -> 延后处理 ---`)
      return
    }
    await this.lock_.lockAsync(() => this.isPushing = true, ArkTSUtils.locks.AsyncLockMode.EXCLUSIVE)
    let message: buffer.Buffer | undefined
    if (!this.headEnd && !this.isSegmented) {
      message = buffer.from(buf)
      const str = message.toString()
      this.headEnd = this.findHeaderEnd(str, message.length)
      if (this.headEnd > 0) {
        this.onHeader(str.substring(0, this.headEnd))
        this.headEnd = this.readPos + this.headEnd
        if (this.length === 0) {
          this.readPos = this.headEnd
        }
      }
    }
    const onData = this.exchange.getAttribute('on-data')
    if (onData instanceof Function) {
      this.isSegmented = true
      let stream: ArrayBuffer
      if (this.readPos) {
        stream = buf.slice(this.readPos)
        this.readPos = 0
      } else {
        stream = buf
      }
      // LocalSend伪chunked传输content-length!=文件长度?
      if (this.length == 0) {
        this.length += this.headEnd
      }
      this.length += stream.byteLength
      this.index += 1
      onData(stream, this.index)
      this.isPushing = false
      if (this.streams.length > 0) {
        const detained = this.streams.pop()
        this.push(detained)
      } else {
        this.checkEnd()
      }
      return
    }
    if (!message) {
      message = buffer.from(buf)
    }
    const availLength = this.buffer.length - this.length
    if (message.length > availLength) {
      let exLength = Math.ceil((this.length + message.length) / this.expandSize) * this.expandSize;
      const temp = buffer.alloc(exLength)

      //将原有的全量Buffer复制到临时的Buffer中
      this.buffer.copy(temp, 0, this.readPos, this.writeStart);
      this.buffer = null;
      this.buffer = temp;

      //将新的message复制到全量Buffer
      this.writeStart = this.length;
      message.copy(this.buffer, this.writeStart, 0, this.buffer.length)
      this.length += message.length;
      this.writeStart += message.length;
    } else {
      message.copy(this.buffer, this.writeStart, this.readPos, message.length)
      this.length += message.length
      this.writeStart += message.length
    }
    this.checkEnd()
    this.isPushing = false
    if (this.streams.length > 0) {
      const detained = this.streams.pop()
      this.push(detained)
    }
  }

  private checkEnd() {
    if (this.headEnd > 0 && this.length >= this.headEnd) {
      const length = this.length - this.headEnd
      const contentLength: number | undefined = this.exchange.getRequestHeaders().getContentLength()
      // logger.debug(`checkEnd length: ${length} contentLength: ${contentLength}`)
      if ((contentLength === undefined && !this.exchange.getRequestHeaders().hasChunked()) || length == contentLength) {
        this.exchange.isEnd = true
        if (this.buffer && !this.isSegmented) {
          this.exchange.setRequestBody(buffer.from(this.buffer.buffer.slice(0, length)))
        }
        const onFinish = this.exchange.getAttribute('on-end')
        if (onFinish && onFinish instanceof Function) {
          onFinish()
        } else {
          this.exchange.getHttpContext()?.getHandler()?.handle(this.exchange)
        }
        this.reset()
      }
    }
  }

  /**
   * 获取当前正文长度
   * 如果headPos存在，返回数据写入位置与headPos之间的距离
   * 如果headPos不存在，返回headPos
   * @return {number} 返回当前正文长度
   */
  public getCurrentBodyLength(): number {
    if (this.headEnd) { // 判断headPos是否存在
      return this.writeStart - this.headEnd; // 返回数据写入位置与headPos之间的距离
    } else {
      return this.headEnd; // 如果headPos不存在，返回headPos
    }
  }

  reset() {
    this.buffer = null
    this.buffer = buffer.allocUninitializedFromPool(this.expandSize)
    this.length = 0
    this.readPos = 0
    this.writeStart = 0
    this.headEnd = 0
    this.isSegmented = false
    // super.removeAllListeners()
  }

  /**
   * 查找消息头部结束位置
   * @param inputStream 输入流
   * @param rlen 读取长度
   * @return 返回头部结束位置
   */
  private findHeaderEnd(inputStream: string, rlen: number): number {
    let splitByte: number = 0;
    while (splitByte + 1 < rlen) {
      /*
       * 这是根据RFC2616（HTTP 1.1协议的官方文档）中的规定，头部的结束是由两个'\r\n'组成的
       * 首先检查splitByte位置的字符串和splitByte + 1位置的字符串是否为“\r”和“\n”，同时splitByte + 2和splitByte + 3位置的字符串
       * 是否也是为“\r”和“\n”，如果都是那么返回splitByte + 4，表示找到了头部的结束位置。
       */
      const firstCase = inputStream[splitByte] === '\r' && inputStream[splitByte + 1] === '\n';
      const lessThan = splitByte + number3 < rlen;
      const secondCase = inputStream[splitByte + number2] === '\r' && inputStream[splitByte + number3] === '\n';
      if (firstCase && lessThan && secondCase) {
        return splitByte + number4;
      }

      /*
       * 为了兼容某些不完全符合RFC2616的情况， tolerance
       * 检查splitByte位置的字符串和splitByte + 1位置的字符串是否为两个“\n”，如果是，那么返回splitByte + 2，表示找到了头部结束的位置
       */
      if (inputStream[splitByte] === '\n' && inputStream[splitByte + 1] === '\n') {
        return splitByte + number2;
      }
      splitByte++;
    }
    return 0;
  }

  toString() {
    try {
      return this.buffer ? buf2String(this.buffer.buffer) : ''
    } finally {
      this.buffer = null
    }
  }
}