import { GameContext } from './game-context';
import { GameSessionService } from './game-session-service';
import { McpEntities } from './game-types';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import {
  ReadResourceResult, // <-- New import
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import { Buffer } from 'buffer';

// --- NEW RESOURCE FACTORY ---

/**
 * A simplified type for our core resource logic.
 * It just needs to return the data object that will be serialized into JSON.
 */
export type GameResourceLogic = (gameContext: GameContext) => object | null;

/**
 * A Higher-Order Function to create a type-safe MCP resource handler.
 * It encapsulates the boilerplate of creating the GameContext and formatting the response.
 *
 * @param dependencies The shared services needed to create the context.
 * @param logic The core business logic that returns a data object.
 * @returns An async function compatible with `server.resource()`
 */
export function createGameResourceHandler(
  dependencies: {
    sessionService: GameSessionService;
    mcpEntities: McpEntities;
    serverName: string;
  },
  logic: GameResourceLogic,
) {
  // This is the function that will be passed to server.resource()
  return async (
    uri: URL,
    mcpContext: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<ReadResourceResult> => {
    // 1. --- BOILERPLATE START ---
    const userId = mcpContext.authInfo?.extra?.user_id as string | undefined;
    if (!userId || !mcpContext.sessionId) {
      // Or return a specific CallToolResult error
      throw new Error('Session ID is missing. Cannot execute tool.');
    }

    const gameContext = await GameContext.create(
      userId,
      mcpContext.sessionId,
      dependencies.sessionService,
      dependencies.mcpEntities,
      dependencies.serverName,
    );
    // --- BOILERPLATE END ---

    // 2. Execute the core resource logic with the prepared context
    const dataObject = logic(gameContext);

    // 3. --- BOILERPLATE RESPONSE FORMATTING ---
    if (!dataObject) {
      // Handle cases where there's no data (e.g., user is in the lobby)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ message: 'No active game data available.' }),
          },
        ],
      };
    }

    const jsonString = JSON.stringify(dataObject, null, 2);
    const dataBuffer = Buffer.from(jsonString, 'utf-8');
    const base64EncodedBlob = dataBuffer.toString('base64');

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          blob: base64EncodedBlob,
        },
      ],
    };
  };
}
