import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { GameContext } from '../../game/core/game-context';
import { Buffer } from 'buffer'; // Ensure Buffer is available for blobification

export function createGameStateResource(
  server: McpServer,
  gameContext: GameContext,
  uriString: string,
): RegisteredResource {
  return server.resource(
    'game_state',
    uriString,
    { description: 'Current game state data.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      const dataObject = gameContext.getGameStateUIDataForResource();
      if (!dataObject) {
        return {
          contents: [
            {
              uri: uri.href,
              text: 'Game not active or state unavailable.',
            },
          ],
        };
      }

      const jsonString = JSON.stringify(dataObject);
      // Create a buffer from the JSON string
      const dataBuffer = Buffer.from(jsonString, 'utf-8');
      // Encode the buffer to a Base64 string
      const base64EncodedBlob = dataBuffer.toString('base64');

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            blob: base64EncodedBlob, // Use the Base64 encoded string
          },
        ],
      };
    },
  );
}
