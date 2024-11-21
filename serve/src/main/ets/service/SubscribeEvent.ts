import { IncomingMessage, ServerResponse } from "../http"
import { buffer } from "@kit.ArkTS"

export interface SubscribeEvent {
  onHeader(req: IncomingMessage, res: ServerResponse)

  onConnect(req: IncomingMessage, res: ServerResponse)

  onData(req: IncomingMessage, res: ServerResponse, stream: buffer.Buffer)
}