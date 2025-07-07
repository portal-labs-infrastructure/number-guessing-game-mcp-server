import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { GameContext } from '../../game/core/game-context';
import { McpEntities } from '../../game/core/game-types';
import { GameSessionService } from '../../game/core/game-session-service';
// Import our new resource factory
import { createGameResourceHandler } from '../../game/core/resource-factory';

export function setupGameStateResource(
  server: McpServer,
  sessionService: GameSessionService,
  mcpEntities: McpEntities,
  serverName: string,
  resourceUriString: string,
): RegisteredResource {
  // The core logic for getting the game state UI data.
  // The signature is now just (gameContext) => object | null.
  const gameStateLogic = (gameContext: GameContext) => {
    return gameContext.getGameStateUIDataForResource();
  };

  const resource = server.resource(
    'game_state',
    resourceUriString,
    { description: 'Current game state data for your session.' },
    // Use the factory to wrap our logic with the context and response boilerplate
    createGameResourceHandler(
      { sessionService, mcpEntities, serverName },
      gameStateLogic,
    ),
  );

  resource.disable(); // Start disabled, enabled in LobbyState
  return resource;
}
