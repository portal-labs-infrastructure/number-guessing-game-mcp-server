import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GameContext } from '../../game/core/game-context';
import { GuessNumberCommand } from '../../game/commands/guess-number.command';

export function setupGuessNumberTool(
  server: McpServer,
  gameContext: GameContext,
): RegisteredTool {
  // Schema will be updated by GameContext via mcpEntities.guessNumberTool.update()
  const initialGuessSchema = {
    guess: z.number().int().describe(`Your guess.`),
  };
  return server.tool(
    'guess_number',
    initialGuessSchema,
    async (payload): Promise<CallToolResult> => {
      const cmd = new GuessNumberCommand(gameContext, payload);
      return cmd.execute();
    },
  );
}
