import { buffer, JSON, uri } from '@kit.ArkTS';
import { BufferPool } from './BufferPool';
import { HttpError, ContentType, IncomingMessage } from '.';
import { getLogger, Logger } from '../utils';

const NEW_LINE: string = '\n';

const ContentTypeRegex = /([ |\t]*content-type[ |\t]*:)(.*)/;
const ContentDispositionRegex = /([ |\t]*Content-Disposition[ |\t]*:)(.*)/;
const ContentDispositionAttributeRegex = /[ |\t]*([a-zA-Z]*)[ |\t]*=[ |\t]*['|\"]([^\"^']*)['|\"]/;

const logger: Logger = getLogger('Parser')

export class Parser {
  static parseHeader(socket: string, incoming: IncomingMessage): IncomingMessage {
    try {
      // 把socket字符串按照换行符分割成多行，并取出第一行
      const lines: string[] = socket.split(/[\r\n]+/);
      let line: string | undefined = lines.shift();

      // 把第一行按照空格分割，得到请求行数据 {POST /index HTTP/1.1}
      let status: string[] = (line !== '') ? line?.split(' ') : []
      if (status.length != 3) {
        throw Error("Bad Request")
      }

      const request = incoming
      request.method = status[0].toUpperCase()
      //获取URL请求路径和URL参数
      let original = status[1]
      const result: uri.URI = new uri.URI(original)
      const queryNames = result.getQueryNames()
      for (let name of queryNames) {
        request.queryParameters[name] = result.getQueryValue(name)
      }
      request.originalUrl = original
      request.url = result.path
      request.protocol = status[2]

      // 请求头
      line = lines.shift();
      while (line) {
        const index: number = line.indexOf(':');
        if (index > 0) {
          request.headers[line.substring(0, index).trim().toLowerCase()] = line.substring(index + 1).trim();
        }
        line = lines.shift()
      }

      const connection = request.headers['connection']
      if (IncomingMessage.HTTP_VERSION === request.protocol
        && (connection === undefined || !(/close/ig.test(connection)))) {
        request.isKeepLive = true
      }

      return request
    } catch (e) {
      logger.error(`parseHeader error: ${JSON.stringify(e)}`)
      throw new Error(`SERVER INTERNAL ERROR: IOException: ${e.message}`)
    }
  }

  static parseFormData(body: buffer.Buffer, target: Map<string, string[]>) {
    const data = body.toString()
    if (!data) {
      return
    }
    const params = data.split('&')
    let keyValue = params.shift()
    while (keyValue) {
      // 查找 e包含符合‘=’，赋值给sep
      let sep: number = keyValue.indexOf('=');
      // 键名
      let key: string = null;
      // 键值
      let value: string = null;
      // sep 大于 0， 分割 e 中 符号 ”=“ 前后 分别赋值给 key 和 value
      if (sep >= 0) {
        key = decodeURI(keyValue.substring(0, sep)).trim()
        value = decodeURI(keyValue.substring(sep + 1)).trim()
      } else {
        // 否则，符号 ”=“ 前 只赋值 key， value = 空字符串
        key = decodeURI(keyValue).trim();
        value = '';
      }
      // 从 parseParameters 映射中获取 key 对应的值
      let values: string[] = target.get(key);

      // 如果不存在，则创建一个新的数组并且赋值 给values
      if (values === undefined) {
        values = new Array<string>();
        target.set(key, values);
      }
      values.push(value)
      keyValue = params.shift()
    }
  }

  static parseJson<T>(body: buffer.Buffer): T {
    const data = body.toString()
    if (!data) {
      return {} as T
    }
    return JSON.parse(data) as T
  }

  /**
   * 解析multipart/form-data类型的HTTP请求体
   * @param contentType 请求体的ContentType
   * @param bp 请求体的BufferPool
   * @param params 用于存储解析出来的参数
   * @param files 用于存储解析出来的文件
   */
  static parseMultipartFormData(contentType: ContentType, bufferPool: BufferPool, params: Map<string, string[]>,
    files: Map<string, buffer.Buffer>): void {
    // 找到所有boundary的位置
    const boundaryIdxs = Parser.getBoundaryPositions(bufferPool, `--${contentType.getBoundary()}`);

    // 检查找到的boundary数量
    if (boundaryIdxs.length < 2) {
      throw HttpError.error(
        400, 'BAD REQUEST: Content type is multipart/form-data but contains less than two boundary strings.'
      );
    }

    // boundary块循环解析
    for (let boundaryIdx = 0; boundaryIdx < boundaryIdxs.length - 1; boundaryIdx++) {
      // 把每个boundary之间的数据块解析出来
      const mpBlock: buffer.Buffer = buffer.allocUninitializedFromPool(
        boundaryIdxs[boundaryIdx + 1] - boundaryIdxs[boundaryIdx]
      )
      bufferPool.buffer.copy(mpBlock, 0, boundaryIdxs[boundaryIdx], boundaryIdxs[boundaryIdx + 1]);
      const mpBlockString = mpBlock.toString('utf-8', 0, mpBlock.length);
      let mpLines: string[] = mpBlockString.split(/\r\n/);
      let headerLines: number = 0;
      let mpLine: string = mpLines.shift();
      headerLines++;
      if (!mpLine) {
        throw HttpError.error(
          400, 'BAD REQUEST: Content type is multipart/form-data but chunk does not start with boundary.'
        );
      }
      mpLine = mpLines.shift();
      headerLines++;
      let partName: string;
      let fileName: string;
      let partContentType: string;

      // boundary块解析
      while (mpLine && (mpLine.trim().length > 0)) {
        // Content-Disposition
        const regex = new RegExp(ContentDispositionRegex, 'i');
        const match: RegExpExecArray | null = regex.exec(mpLine);
        if (match) {
          const regexGi = new RegExp(ContentDispositionAttributeRegex, 'gi');
          let matchAttribute: RegExpMatchArray | null = match[2].match(regexGi);
          matchAttribute.map((item) => {
            // Content-Disposition Attribute
            const matcher: RegExpExecArray | null = ContentDispositionAttributeRegex.exec(item);
            if (matcher) {
              let key: string = matcher[1].toLowerCase();
              if (key === 'name') {
                partName = matcher[2];
              }
              if (key === 'filename') {
                fileName = matcher[2];
              }
            }
          });
        }
        // contentType
        const regexContentType = new RegExp(ContentTypeRegex, 'i');
        const matchContentType: RegExpExecArray | null = regexContentType.exec(mpLine);
        if (matchContentType) {
          partContentType = matchContentType[2].trim();
        }
        mpLine = mpLines.shift();
        headerLines++;
      }

      // Read the part data
      let partHeaderLength: number = 0;
      while (headerLines-- > 1) {
        partHeaderLength = Parser.scipOverNewLine(mpBlockString, partHeaderLength);
      }

      let partDataStart: number = boundaryIdxs[boundaryIdx] + partHeaderLength + 2;
      let partDataEnd: number = boundaryIdxs[boundaryIdx + 1] - 4 + 2;

      let values: string[] = params.get(partName);
      if (!values) {
        values = new Array<string>();
        params.set(partName, values);
      }
      let data: buffer.Buffer = buffer.allocUninitializedFromPool(partDataEnd - partDataStart);
      bufferPool.buffer.copy(data, 0, partDataStart, partDataEnd);
      if (!partContentType) {
        // Read the part into a string
        values.push(data.toString('utf-8', 0, data.length));
      } else {
        // Read it into a file
        if (!files.has(partName)) {
          files.set(partName, data);
        } else {
          let count: number = 2;
          while (files.has(partName + count)) {
            count++;
          }
          files.set(partName + count, data);
        }
        values.push(fileName);
      }
    }
  }

  /**
   * 获取缓冲池中的边界位置
   * @param bp 缓冲池对象
   * @param boundary 边界字符串
   * @return 返回边界位置的数组，如果没有找到匹配的边界位置，则返回空数组
   */
  private static getBoundaryPositions(bp: BufferPool, boundary: string): number[] {
    // 初始化结果数组
    const res: number[] = [];
    // 如果缓冲池的当前体长度小于边界字符串的长度，则直接返回空结果数组
    if (bp.getCurrentBodyLength() < boundary.length) {
      return res;
    }
    let byteOffset: number = 0;
    let buf: buffer.Buffer = bp.buffer;
    let isInclude = buf.includes(boundary, byteOffset);
    while (isInclude && (byteOffset < buf.length)) {
      byteOffset = buf.indexOf(boundary, byteOffset);
      res.push(byteOffset);
      byteOffset += 1;
      isInclude = buf.includes(boundary, byteOffset);
    }
    // 返回结果数组
    return res;
  }

  /**
   * 跳过新行符，直到遇到下一个字符
   * @param partHeaderBuff 字符串，用于查找新行符
   * @param index 开始查找的位置
   * @return 返回新行符后一个字符的位置
   */
  private static scipOverNewLine(partHeaderBuff: string, index: number): number {
    let newIndex: number = index;
    // 当前字符不是新行符时，继续向后查找
    while (partHeaderBuff[newIndex] !== NEW_LINE) {
      newIndex++;
    }
    // 返回新行符后一个字符的位置
    return ++newIndex;
  }
}