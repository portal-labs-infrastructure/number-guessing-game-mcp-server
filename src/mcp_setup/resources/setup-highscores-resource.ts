import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { HighScoreEntry } from '../../game/core/game-types';
import { GameSessionService } from '../../game/core/game-session-service';

/**
 * Creates the resource that serves the global high scores list.
 * It fetches the data directly from Firestore on each request.
 * @param server The McpServer instance.
 * @param sessionService The service for interacting with Firestore.
 * @param resourceUriString The full URI for this resource.
 * @returns The RegisteredResource object.
 */
export function setupHighscoresResource(
  server: McpServer,
  sessionService: GameSessionService, // <-- Receives the service
  resourceUriString: string,
): RegisteredResource {
  return server.resource(
    'highscores',
    resourceUriString,
    { description: 'Top 10 high scores.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      try {
        // Fetch the latest high scores directly from our service.
        // No GameContext or sessionId is needed because this data is global.
        const highScores: HighScoreEntry[] =
          await sessionService.getHighScores();

        // Sort by attempts, just in case the stored data isn't sorted.
        const sortedScores = highScores.sort((a, b) => a.attempts - b.attempts);

        // Convert the structured data to a JSON string.
        // This is more robust than sending plain text.
        const jsonString = JSON.stringify(sortedScores, null, 2); // Pretty-print

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json', // Sending structured data is better practice
              text: jsonString,
            },
          ],
        };
      } catch (error) {
        console.error(
          '[HighscoresResource] Failed to fetch high scores:',
          error,
        );
        throw new Error('Server error: Could not load high scores.');
      }
    },
  );
}
