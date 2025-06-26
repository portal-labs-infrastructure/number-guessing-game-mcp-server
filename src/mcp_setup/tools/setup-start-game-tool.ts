// In your tool setup file, e.g., 'src/tools/start-game.tool.ts'

import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StartGameCommand } from '../../game/commands/start-game.command';
import { McpEntities } from '../../game/core/game-types';
import { GameSessionService } from '../../game/core/game-session-service';
// Import our new factory function
import { createGameToolHandler } from '../../game/core/tool-factory';
import { GameContext } from '../../game/core/game-context';

export function setupStartGameTool(
  server: McpServer,
  sessionService: GameSessionService,
  mcpEntities: McpEntities,
  serverName: string,
): RegisteredTool {
  // The core logic for starting a game.
  // Notice the signature is now (payload, gameContext) - much cleaner!
  const startGameLogic = async (
    payload: { playerName: string },
    gameContext: GameContext,
  ) => {
    const cmd = new StartGameCommand(gameContext, payload);
    return cmd.execute();
  };

  return server.registerTool(
    'start_game',
    {
      title: 'Start Game',
      description: 'Start a new game session with your player name.',
      inputSchema: {
        playerName: z.string().min(1).max(50).describe('Your player name.'),
      },
    },
    // Use the factory to wrap our logic with the context creation boilerplate
    createGameToolHandler(
      { sessionService, mcpEntities, serverName },
      startGameLogic,
    ),
  );
}
