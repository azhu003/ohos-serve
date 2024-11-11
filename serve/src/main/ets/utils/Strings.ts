import { util } from "@kit.ArkTS";
import { getLogger, Logger } from "./Logger";

const logger: Logger = getLogger('Strings')

export function buf2String(buf: ArrayBuffer): string {
  let msgArray: Uint8Array = new Uint8Array(buf);
  let textDecoder: util.TextDecoder = util.TextDecoder.create("utf-8");
  return textDecoder.decodeToString(msgArray)
}

const FORMAT_PLACEHOLDER = /%s/

export function formatString(format: string, ...args: string[]) {
  let result = format
  args.forEach(value => {
    result = result.replace(FORMAT_PLACEHOLDER, value)
  })
  return result
}

export function decodeUrl(str: string): string {
  let decoded: string = '';
  try {
    decoded = decodeURI(str);
  } catch (e) {
    logger.debug(`decode url error: ${e}`)
  }
  return decoded;
}