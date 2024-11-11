import { buffer } from "@kit.ArkTS";
import { buf2String, EventEmitter } from "../utils";
import { IncomingMessage } from ".";

const number2 = 2;
const number3 = 3;
const number4 = 4;

export class BufferPool extends EventEmitter {
  private expandSize: number = 1024 * 1024 //每次扩容的长度
  buffer: buffer.Buffer
  length: number = 0 //数据长度
  readPos: number = 0 //开始读取位置
  writeStart: number = 0 //写入位置
  headEnd: number = 0 //请求头结束位置

  constructor(size: number) {
    super()
    this.buffer = buffer.alloc(size);
  }

  push(message: buffer.Buffer, request: IncomingMessage): void {
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
      message.copy(this.buffer, this.writeStart, 0, message.length)
      this.length += message.length
      this.writeStart += message.length
    }
    if (!this.headEnd) {
      this.headEnd = this.findHeaderEnd(message.toString('utf-8'), message.length)
      if (this.headEnd) {
        const header = this.buffer.toString('utf-8', this.readPos, this.readPos + this.headEnd)
        super.emit("header-event", header)
      }
      this.headEnd = this.readPos + this.headEnd
    }
    if (this.headEnd && this.length >= this.headEnd) {
      const length = this.length - this.headEnd
      if (length == request.getContentLength()) {
        super.emit("complete-event")
      }
    }
  }

  getBody(): buffer.Buffer {
    const body = buffer.alloc(this.length - this.headEnd)
    this.buffer.copy(body, 0, this.headEnd, this.buffer.length)
    return body
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
      return buf2String(this.buffer.buffer)
    } finally {
      this.buffer = null
    }
  }
}