import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { GameContext } from '../../game/core/game-context';
import { GiveUpCommand } from '../../game/commands/give-up.command';
import { McpEntities } from '../../game/core/game-types';
import { GameSessionService } from '../../game/core/game-session-service';
// Import our new factory function
import { createGameToolHandler } from '../../game/core/tool-factory';

export function setupGiveUpTool(
  server: McpServer,
  sessionService: GameSessionService,
  mcpEntities: McpEntities,
  serverName: string,
): RegisteredTool {
  // The core logic for giving up. Note the payload is an empty object.
  const giveUpLogic = async (payload: {}, gameContext: GameContext) => {
    const cmd = new GiveUpCommand(gameContext);
    return cmd.execute();
  };

  const tool = server.registerTool(
    'give_up',
    {
      title: 'Give Up',
      description: 'End the game session and reveal the number.',
      inputSchema: {}, // No parameters needed for this action
    }, // No parameters
    // Use the factory to wrap our logic with the context creation boilerplate
    createGameToolHandler(
      { sessionService, mcpEntities, serverName },
      giveUpLogic,
    ),
  );

  tool.disable(); // Start disabled, enabled in PlayingState
  return tool;
}
