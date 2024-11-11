import { hilog } from '@kit.PerformanceAnalysisKit';

export class Logger {
  private tag: string
  private enable: boolean = false

  constructor(tag: string, enable: boolean) {
    this.tag = tag
    this.enable = enable
  }

  debug(format: string, ...args: (string | number)[]) {
    if (this.enable) {
      hilog.debug(0x0000, this.tag, format, args)
    }
  }

  info(format: string, ...args: (string | number)[]) {
    if (this.enable) {
      hilog.info(0x0000, this.tag, format, args)
    }
  }

  warn(format: string, ...args: (string | number)[]) {
    if (this.enable) {
      hilog.warn(0x0000, this.tag, format, args)
    }
  }

  error(format: string, ...args: (string | number)[]) {
    if (this.enable) {
      hilog.error(0x0000, this.tag, format, args)
    }
  }

  fatal(format: string, ...args: (string | number)[]) {
    if (this.enable) {
      hilog.fatal(0x0000, this.tag, format, args)
    }
  }
}

export function getLogger(tag: string, enable: boolean = true): Logger {
  return new Logger(tag, enable)
}