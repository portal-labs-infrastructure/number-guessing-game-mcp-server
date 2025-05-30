import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { GameContext } from '../../game/core/game-context';

export function setupHighscoresResource(
  server: McpServer,
  gameContext: GameContext,
  uriString: string,
): RegisteredResource {
  return server.resource(
    'highscores',
    uriString,
    { description: 'Top 10 high scores.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      const data = gameContext.getHighScoresData();
      return {
        contents: [
          {
            uri: uri.href,
            text:
              data
                .map(
                  (hs, idx) =>
                    `${idx + 1}. ${hs.playerName}: ${hs.attempts} attempts`,
                )
                .join('\n') || 'No high scores yet.',
          },
        ],
      };
    },
  );
}
