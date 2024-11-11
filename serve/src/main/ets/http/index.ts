import { Server } from '../service/';

export * from './ContentType';

export * from './HttpError';

export * from './IncomingMessage';

export * from './ServerResponse';

export * from './StatusCode';

export const http = {
  createServer: function () {
    return new Server();
  }
}
