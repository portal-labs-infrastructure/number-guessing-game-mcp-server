import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GameContext } from '../../game/core/game-context';
import { GuessNumberCommand } from '../../game/commands/guess-number.command';
import { McpEntities } from '../../game/core/game-types';
import { GameSessionService } from '../../game/core/game-session-service';
// Import our new factory function
import { createGameToolHandler } from '../../game/core/tool-factory';

export function setupGuessNumberTool(
  server: McpServer,
  sessionService: GameSessionService,
  mcpEntities: McpEntities,
  serverName: string,
): RegisteredTool {
  const initialGuessSchema = {
    guess: z.number().int().describe(`Your guess.`),
  };

  // The core logic for making a guess.
  const guessNumberLogic = async (
    payload: { guess: number },
    gameContext: GameContext,
  ) => {
    const cmd = new GuessNumberCommand(gameContext, payload);
    return cmd.execute();
  };

  return server.registerTool(
    'guess_number',
    {
      title: 'Make a Guess',
      description: 'Submit your guess for the number.',
      inputSchema: initialGuessSchema,
    },
    // Use the factory to wrap our logic with the context creation boilerplate
    createGameToolHandler(
      { sessionService, mcpEntities, serverName },
      guessNumberLogic,
    ),
  );
}
