// src/controllers/mcpController.ts

import { Request, Response, RequestHandler, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { db } from '../services/firestore.service';
import { createGameServerInstance } from '../mcp_setup';

// --- Imports for Session Entity Management ---
import { McpEntities } from '../game/core/game-types';
import { GameSessionService } from '../game/core/game-session-service';
import { GameContext } from '../game/core/game-context';
import {
  setupStartGameTool,
  setupGuessNumberTool,
  setupGiveUpTool,
} from '../mcp_setup/tools';
import {
  setupBannerImageResource,
  setupGameRulesResource,
  setupGameStateResource,
  setupHighscoresResource,
  setupSimpleHtmlPageResource,
} from '../mcp_setup/resources';

// =================================================================
// --- Global State ---
// =================================================================

// A single, global server instance to manage connections.
const gameServer: McpServer = createGameServerInstance();

// A map to hold the active transport connection for each user.
const activeTransports = new Map<string, StreamableHTTPServerTransport>();

// A map to hold the unique set of tools and resources for each active user session.
const activeSessionEntities = new Map<string, McpEntities>();

const SERVER_INSTANCE_NAME = process.env.K_SERVICE || 'local';
const SERVER_DISPLAY_NAME = 'Number Guessing Game';

// =================================================================
// --- Session Lifecycle Management ---
// =================================================================

/**
 * Creates a full set of MCP entities for a new user session and initializes their state.
 * This function is called when a user's transport is first initialized.
 */
async function initializeSession(userId: string): Promise<void> {
  console.log(`[Controller] Initializing session for user: ${userId}`);
  const sessionService = new GameSessionService(db);
  const mcpEntities: McpEntities = {
    startGameTool: null,
    guessNumberTool: null,
    giveUpTool: null,
    gameStateResource: null,
    highscoresResource: null,
    bannerImageResource: null,
    gameRulesResource: null,
    simpleHtmlPageResource: null,
    server: gameServer, // Store the global server instance for this session
  };

  const BASE_URI = `mcp://${SERVER_DISPLAY_NAME.toLowerCase().replaceAll(' ', '-')}`;

  // Create a fresh, dedicated set of tools and resources for this user
  mcpEntities.startGameTool = setupStartGameTool(
    gameServer,
    sessionService,
    mcpEntities,
    SERVER_INSTANCE_NAME,
  );
  mcpEntities.startGameTool.disable();
  mcpEntities.guessNumberTool = setupGuessNumberTool(
    gameServer,
    sessionService,
    mcpEntities,
    SERVER_INSTANCE_NAME,
  );
  mcpEntities.guessNumberTool.disable();
  mcpEntities.giveUpTool = setupGiveUpTool(
    gameServer,
    sessionService,
    mcpEntities,
    SERVER_INSTANCE_NAME,
  );
  mcpEntities.giveUpTool.disable();

  mcpEntities.gameStateResource = setupGameStateResource(
    gameServer,
    sessionService,
    mcpEntities,
    SERVER_INSTANCE_NAME,
    `${BASE_URI}/game_state`,
  );
  mcpEntities.gameStateResource.disable();
  mcpEntities.highscoresResource = setupHighscoresResource(
    gameServer,
    sessionService,
    `${BASE_URI}/highscores`,
  );
  mcpEntities.bannerImageResource = setupBannerImageResource(
    gameServer,
    `${BASE_URI}/banner`,
  );
  mcpEntities.gameRulesResource = setupGameRulesResource(
    gameServer,
    `${BASE_URI}/rules`,
  );
  mcpEntities.simpleHtmlPageResource = setupSimpleHtmlPageResource(
    gameServer,
    `${BASE_URI}/simple_interactive_page`,
  );

  // Store this user's unique entities in our global map
  activeSessionEntities.set(userId, mcpEntities);

  // Initialize the UI state by loading from the DB and "entering" the current state
  try {
    const context = await GameContext.create(
      userId,
      sessionService,
      mcpEntities,
      SERVER_INSTANCE_NAME,
    );
    context.initializeStateLogic(); // This enables/disables the correct tools for this user
    console.log(
      `[Controller] UI for ${userId} initialized to state: ${context.getCurrentState().constructor.name}`,
    );
  } catch (error) {
    console.error(
      `[Controller] Failed to initialize state for session ${userId}:`,
      error,
    );
  }
}

/**
 * Destroys all MCP entities for a user session to prevent memory leaks.
 * This function is called when a user's transport is closed.
 */
function destroySession(userId: string): void {
  console.log(`[Controller] Destroying session for user: ${userId}`);
  const sessionEntities = activeSessionEntities.get(userId);

  if (sessionEntities) {
    // Unregister every tool and resource to remove them from the server
    Object.values(sessionEntities).forEach((entity) => {
      if (entity && typeof entity.unregister === 'function') {
        entity.unregister();
      }
    });
    // Remove the session from the map
    activeSessionEntities.delete(userId);
  }
}

// =================================================================
// --- Transport Factory ---
// =================================================================

function getOrCreateTransportForUser(
  userId: string,
  req: Request,
): StreamableHTTPServerTransport | null {
  if (isInitializeRequest(req.body)) {
    const newTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),

      // This is our "onClientConnected" hook
      onsessioninitialized: (transportSessionId) => {
        console.log(
          `[Controller] New transport created for user ${userId}. Storing in map. (Transport ID: ${transportSessionId})`,
        );
        activeTransports.set(userId, newTransport);
        // Initialize the user's entire world of tools and resources
      },
    });

    newTransport.onclose = () => {
      console.log(`[Controller] Transport closed for user ${userId}.`);
      activeTransports.delete(userId);
      destroySession(userId);
    };

    initializeSession(userId).catch((err) =>
      console.error(`[Controller] Initialization failed for ${userId}:`, err),
    );

    gameServer.connect(newTransport).catch((err) => {
      console.error(
        `[Controller] Failed to connect new transport for user ${userId}:`,
        err,
      );
    });

    return newTransport;
  }

  if (activeTransports.has(userId)) {
    return activeTransports.get(userId)!;
  }

  return null;
}

// =================================================================
// --- Express Request Handlers ---
// =================================================================

/**
 * Handles all POST requests to the /mcp endpoint.
 */
export const handleMcpPost: RequestHandler = async (req, res, next) => {
  const requestId = req.body?.id ?? 'N/A_POST';
  const userId = req.auth?.extra?.user_id as string | undefined;

  if (!userId) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Authentication required.' },
      id: requestId,
    });
    return;
  }

  console.log(`[Controller][Req-${requestId}] POST /mcp. User: ${userId}.`);

  try {
    const transport = getOrCreateTransportForUser(userId, req);

    if (!transport) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid request: Session not initialized for this user.',
        },
        id: requestId,
      });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error(
      `[Controller][Req-${requestId}] Error during transport.handleRequest for user ${userId}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error: ' + error.message,
        },
        id: req.body?.id ?? null,
      });
    }
  }
};

/**
 * Handles GET (long-polling) and DELETE (disconnect) requests.
 */
export const handleMcpSessionManagement: RequestHandler = async (
  req,
  res,
  next,
) => {
  const userId = req.auth?.extra?.user_id as string | undefined;

  if (!userId) {
    res.status(401).send('Authentication required for session management.');
    return;
  }

  console.log(`[Controller] ${req.method} /mcp. User: ${userId}.`);

  const transport = activeTransports.get(userId);

  if (!transport) {
    res.status(404).send('No active session found for this user.');
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (error: any) {
    console.error(
      `[Controller] Error in ${req.method} for user ${userId}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(500).send('Internal server error: ' + error.message);
    }
  }
};

/**
 * Handles requests with unsupported HTTP methods.
 */
export const handleMcpMethodNotAllowed: RequestHandler = (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }),
  );
};
