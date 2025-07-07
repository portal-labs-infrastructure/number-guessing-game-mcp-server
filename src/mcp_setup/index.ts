import { Implementation } from '@modelcontextprotocol/sdk/types.js';

export function createMcpServerOptions(): Implementation {
  const serverName = `Number Guessing Game`;

  const serverOptions: Implementation = {
    name: serverName,
    version: '3.0.0',
    description:
      'A stateless, scalable number guessing game using MCP and Firestore.',
  };
  return serverOptions;
}
