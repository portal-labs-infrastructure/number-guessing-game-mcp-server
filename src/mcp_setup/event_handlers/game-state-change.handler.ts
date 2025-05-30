import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GameContext, GameContextEvents } from '../../game/core/game-context';
import { McpEntities } from '../../game/core/game-types'; // McpEntities now includes server
import { IGameState } from '../../game/states/game-state.interface'; // For type hint
import { PlayingState } from '../../game/states/playing.state';
import { LobbyState } from '../../game/states/lobby.state';
import { createGameStateResource } from '../resources/setup-game-state-resource';

export function setupGameStateChangeListener(
  gameContext: GameContext,
  mcpEntities: McpEntities,
  server: McpServer,
  gameStateResourceUriString: string,
  serverNameForLogging: string,
) {
  gameContext.on(
    GameContextEvents.STATE_CHANGED,
    (eventData: { newState: IGameState; context: GameContext }) => {
      const { newState } = eventData;

      console.log(
        `[GameStateChangeHandler-${serverNameForLogging}] Processing state change to: ${newState.constructor.name}`,
      );

      if (newState instanceof PlayingState) {
        if (!mcpEntities.gameStateResource) {
          mcpEntities.gameStateResource = createGameStateResource(
            mcpEntities.server,
            gameContext,
            gameStateResourceUriString,
          );
          console.log(
            `[GameStateChangeHandler-${serverNameForLogging}] gameStateResource ADDED due to PlayingState.`,
          );
          // CRITICAL: After creating the resource, immediately trigger its content evaluation by the SDK.
          // This ensures the resource exists AND its initial content is pushed before PlayingState.enter()
          // might try to signal an update (though PlayingState.enter() will also call signalGameStateContentUpdate,
          // this makes the initial push part of creation).
          if (mcpEntities.gameStateResource) {
            mcpEntities.gameStateResource.update({});
            console.log(
              `[GameStateChangeHandler-${serverNameForLogging}] Initial update signaled for new gameStateResource.`,
            );
          }
        }
      } else if (newState instanceof LobbyState) {
        if (mcpEntities.gameStateResource) {
          mcpEntities.gameStateResource.remove();
          mcpEntities.gameStateResource = null;
          console.log(
            `[GameStateChangeHandler-${serverNameForLogging}] gameStateResource REMOVED due to ${newState.constructor.name}.`,
          );
        }
      }
    },
  );
}
