import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createGameServerInstance } from '../mcp_setup/mcp-game-server';

interface GameSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}
const activeSessions: Map<string, GameSession> = new Map();

export const handleMcpPost = async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
  let session: GameSession | undefined = undefined;
  const requestId = req.body?.id ?? 'N/A_POST';

  console.log(
    `[Controller][Req-${requestId}] POST /mcp. Session ID from header: ${sessionIdHeader}`,
  );

  if (sessionIdHeader) {
    session = activeSessions.get(sessionIdHeader);
    if (session) {
      console.log(
        `[Controller][Req-${requestId}] Reusing existing session: ${sessionIdHeader}`,
      );
    } else {
      if (isInitializeRequest(req.body)) {
        console.warn(
          `[Controller][Req-${requestId}] Client sent initialize request with an unknown session ID ${sessionIdHeader}. Treating as new session request.`,
        );
      } else {
        console.error(
          `[Controller][Req-${requestId}] Invalid or expired session ID: ${sessionIdHeader}`,
        );
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Invalid or expired session ID: ${sessionIdHeader}`,
          },
          id: req.body?.id ?? null,
        });
        return;
      }
    }
  }

  if (!session && isInitializeRequest(req.body)) {
    console.log(
      `[Controller][Req-${requestId}] Handling new session initialization.`,
    );
    const newTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const newId = randomUUID();
        console.log(
          `[Transport][Req-${requestId}] Generated new session ID: ${newId}`,
        );
        return newId;
      },
      onsessioninitialized: async (newSessionId) => {
        console.log(
          `[Transport][Req-${requestId}] Session initialized with ID: ${newSessionId}`,
        );

        const gameServer = createGameServerInstance();

        try {
          await gameServer.connect(newTransport);
          console.log(
            `[Controller][Req-${requestId}] New McpServer instance connected to transport for session ${newSessionId}`,
          );
        } catch (connectError) {
          console.error(
            `[Controller][Req-${requestId}] Failed to connect McpServer for session ${newSessionId}:`,
            connectError,
          );
          return;
        }

        activeSessions.set(newSessionId, {
          server: gameServer,
          transport: newTransport,
        });
        console.log(
          `[Controller][Req-${requestId}] Session ${newSessionId} stored. Active sessions: ${activeSessions.size}`,
        );
      },
    });

    newTransport.onclose = () => {
      const closedSessionId = newTransport.sessionId;
      if (closedSessionId && activeSessions.has(closedSessionId)) {
        const closedSession = activeSessions.get(closedSessionId)!;
        console.log(
          `[Transport] Transport for session ${closedSessionId} closed. Cleaning up.`,
        );
        closedSession.server
          .close()
          .then(() => {
            console.log(
              `[Controller] McpServer for session ${closedSessionId} closed.`,
            );
          })
          .catch((err) => {
            console.error(
              `[Controller] Error closing McpServer for session ${closedSessionId}:`,
              err,
            );
          });
        activeSessions.delete(closedSessionId);
        console.log(
          `[Controller] Session ${closedSessionId} removed. Active sessions: ${activeSessions.size}`,
        );
      } else if (closedSessionId) {
        console.warn(
          `[Transport] onClose for session ${closedSessionId}, but it was not found in activeSessions.`,
        );
      } else {
        console.warn(
          `[Transport] onClose triggered, but transport had no sessionId at closure.`,
        );
      }
    };
    session = { server: null as any, transport: newTransport }; // Server will be set by onsessioninitialized
  } else if (!session) {
    console.error(
      `[Controller][Req-${requestId}] Bad Request: No session ID, not an initialize request, or session lookup failed.`,
    );
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message:
          'Bad Request: No valid session ID provided, and not an initialization request.',
      },
      id: req.body?.id ?? null,
    });
    return;
  }

  try {
    console.log(
      `[Controller][Req-${requestId}] Forwarding request to transport for session: ${session.transport.sessionId || 'pending initialization'}`,
    );
    await session.transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error(
      `[Controller][Req-${requestId}] Error handling request for session ${session.transport.sessionId}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error: ' + error.message,
        },
        id: req.body?.id ?? null,
      });
    } else {
      console.error(
        `[Controller][Req-${requestId}] Headers already sent for session ${session.transport.sessionId}`,
      );
    }
  }
};

export const handleMcpSessionManagement = async (
  req: Request,
  res: Response,
) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const requestId = randomUUID().slice(0, 8) + '_' + req.method;

  console.log(
    `[Controller][Req-${requestId}] ${req.method} /mcp. Session ID from header: ${sessionId}`,
  );

  if (!sessionId) {
    res.status(400).send('Missing mcp-session-id header');
    return;
  }
  const session = activeSessions.get(sessionId);
  if (!session) {
    res.status(404).send(`Session not found: ${sessionId}`);
    return;
  }
  try {
    await session.transport.handleRequest(req, res);
  } catch (error: any) {
    console.error(
      `[Controller][Req-${requestId}] Error in ${req.method} for session ${sessionId}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(500).send('Internal server error: ' + error.message);
    }
  }
};

export const handleMcpMethodNotAllowed = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }),
  );
};
