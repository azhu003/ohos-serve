import { StatusCode } from './StatusCode'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super()
    super.message = message
    this.status = status
  }

  static error(code: number, msg: string = undefined): HttpError {
    const message: string = msg || StatusCode[code] || 'Request Error'
    return new HttpError(code, message)
  }
}