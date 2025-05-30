import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GameContext } from '../../game/core/game-context';
import { GiveUpCommand } from '../../game/commands/give-up.command';

export function setupGiveUpTool(
  server: McpServer,
  gameContext: GameContext,
): RegisteredTool {
  return server.tool(
    'give_up',
    {}, // Corresponds to z.object({})
    async (): Promise<CallToolResult> => {
      const cmd = new GiveUpCommand(gameContext);
      return cmd.execute();
    },
  );
}
