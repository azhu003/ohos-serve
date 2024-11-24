export interface InetSocketAddress {
  address: string
  family?: 'IPv4' | 'IPv6'
  port: number
  size?: number
}