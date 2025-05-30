import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GameContext } from '../../game/core/game-context';
import { StartGameCommand } from '../../game/commands/start-game.command';

export function setupStartGameTool(
  server: McpServer,
  gameContext: GameContext,
): RegisteredTool {
  return server.tool(
    'start_game',
    { playerName: z.string().min(1).max(50).describe('Your player name.') },
    async (payload): Promise<CallToolResult> => {
      const cmd = new StartGameCommand(gameContext, payload);
      return cmd.execute();
    },
  );
}
