// In a shared file, e.g., 'src/game/core/tool-factory.ts'

import { GameContext } from '../../game/core/game-context';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import { GameSessionService } from '../../game/core/game-session-service';
import { McpEntities } from '../../game/core/game-types';

// The type for our simplified tool logic
export type GameToolLogic<T> = (
  payload: T,
  gameContext: GameContext,
) => Promise<CallToolResult>;

/**
 * A Higher-Order Function to create a type-safe MCP tool handler.
 * It encapsulates the boilerplate of creating the GameContext for each request.
 *
 * @param dependencies The shared services needed to create the context.
 * @param logic The core business logic for the tool.
 * @returns An async function compatible with `server.tool()`
 */
export function createGameToolHandler<T>(
  dependencies: {
    sessionService: GameSessionService;
    mcpEntities: McpEntities;
    serverName: string;
  },
  logic: GameToolLogic<T>,
) {
  // This is the function that will be passed to server.tool()
  return async (
    payload: T,
    mcpContext: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<CallToolResult> => {
    // 1. --- BOILERPLATE START ---
    const userId = mcpContext.authInfo?.extra?.user_id as string | undefined;
    if (!userId) {
      // Or return a specific CallToolResult error
      throw new Error('Session ID is missing. Cannot execute tool.');
    }

    // Create the context for this specific request
    const gameContext = await GameContext.create(
      userId,
      dependencies.sessionService,
      dependencies.mcpEntities,
      dependencies.serverName,
    );
    // --- BOILERPLATE END ---

    // 2. Execute the core tool logic with the prepared context
    return logic(payload, gameContext);
  };
}
