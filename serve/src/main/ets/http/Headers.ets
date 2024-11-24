export class Headers {
  private headers: Map<string, string> = new Map()

  setHeader(name: string, value: string) {
    this.headers.set(name.trim().toLowerCase(), value)
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name)
  }

  getAllHeaders(): Map<string, string> {
    return this.headers
  }

  hasChunked(): boolean {
    return this.headers.get('transfer-encoding') === 'chunked'
  }

  getContentLength(): number|undefined {
    const length = this.headers.get('content-length')
    if (length) {
      return Number.parseInt(length)
    }
    return undefined
  }

  clear() {
    this.headers.clear()
  }
}