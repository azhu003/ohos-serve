import { Server } from '../service/';
import { SubscribeEvent } from '../service/SubscribeEvent';

export * from './ContentType';

export * from './HttpError';

export * from './IncomingMessage';

export * from './ServerResponse';

export * from './StatusCode';

export const http = {
  createServer: function (subscribe: SubscribeEvent | undefined) {
    return new Server(subscribe);
  }
}
