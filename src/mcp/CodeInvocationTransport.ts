import { TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";

import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export class CodeInvocationClientTransport implements Transport {
  private _serverTransport?: CodeInvocationServerTransport;

  constructor() {
    this._serverTransport = undefined;
  }

  setServerTransport(serverTransport: CodeInvocationServerTransport): void {
    this._serverTransport = serverTransport;
  }

  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    this._serverTransport?.onmessage?.(message);
    return Promise.resolve();
  }
  close(): Promise<void> {
    //pass
    return Promise.resolve();
  }
  onclose?: (() => void) | undefined;
  onerror?: ((error: Error) => void) | undefined;
  onmessage?: ((message: JSONRPCMessage, extra?: { authInfo?: AuthInfo; }) => void) | undefined;
  sessionId?: string | undefined;

  start(): Promise<void> {
    //pass
    return Promise.resolve();
  }
}

export class CodeInvocationServerTransport implements Transport {
  private _clientTransport?: CodeInvocationClientTransport;

  constructor() {
    this._clientTransport = undefined;
  }

  setClientTransport(clientTransport: CodeInvocationClientTransport): void {
    this._clientTransport = clientTransport;
  }

  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    this._clientTransport?.onmessage?.(message);
    return Promise.resolve();
  }
  close(): Promise<void> {
    //pass
    return Promise.resolve();
  }
  onclose?: (() => void) | undefined;
  onerror?: ((error: Error) => void) | undefined;
  onmessage?: ((message: JSONRPCMessage, extra?: { authInfo?: AuthInfo; }) => void) | undefined;
  sessionId?: string | undefined;

  start(): Promise<void> {
    //pass
    return Promise.resolve();
  }
}

export interface CodeMCPServer {
  connect(transport: Transport): void;
  getName(): string;
}