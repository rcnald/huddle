declare module 'express' {
  import type { IncomingHttpHeaders, Server } from 'node:http';

  export interface Request {
    body: unknown;
    headers: IncomingHttpHeaders;
    method: string;
    params: Record<string, string>;
    path: string;
    query: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
  }

  export interface Response {
    locals: Record<string, unknown>;
    status(code: number): this;
    json(body: unknown): this;
    sendStatus(code: number): this;
    setHeader(name: string, value: string): this;
    end(): this;
  }

  export type NextFunction = (error?: unknown) => void;
  export type RequestHandler = (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => void | Promise<void>;
  export type ErrorRequestHandler = (
    error: unknown,
    request: Request,
    response: Response,
    next: NextFunction,
  ) => void;

  export interface Router {
    use(handler: RequestHandler): this;
    use(handler: ErrorRequestHandler): this;
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    patch(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
  }

  export interface Application extends Router {
    disable(name: string): this;
    listen(port: number, host?: string, callback?: () => void): Server;
  }

  interface ExpressFactory {
    (): Application;
    json(options?: { limit?: string }): RequestHandler;
    Router(): Router;
  }

  const express: ExpressFactory;
  export default express;
}
