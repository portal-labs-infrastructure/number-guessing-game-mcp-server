// src/mcp_setup.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Creates the single, global McpServer instance for the application.
 * This server is a "blank slate"; it doesn't contain any tools or resources itself.
 * All session-specific entities are now managed by the mcpController.
 */
export function createGameServerInstance(): McpServer {
  const serverName = `Number Guessing Game`;
  console.log(
    `[McpGameServer] Creating global MCP server instance: ${serverName}`,
  );

  const server = new McpServer({
    name: serverName,
    version: '3.0.0',
    description:
      'A stateless, scalable number guessing game using MCP and Firestore.',
  });

  console.log(
    '[McpGameServer] Global server instance configured and ready for connections.',
  );
  return server;
}
