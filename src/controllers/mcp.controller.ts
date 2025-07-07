// src/controllers/mcpController.ts

import { Request, RequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { db } from '../services/firestore.service';
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
// We assume this helper function will be created, similar to the benchmark server.
// It should return the base options for constructing a new McpServer.
import { createMcpServerOptions } from '../mcp_setup';
import crypto from 'node:crypto';

// =================================================================
// --- Global State ---
// =================================================================

// Maps to hold the live objects for all active user sessions.
const activeTransports = new Map<string, StreamableHTTPServerTransport>();
const activeServers = new Map<string, McpServer>(); // Each session gets its own server instance.
const activeContexts = new Map<string, GameContext>(); // Store the game context for each session.

const SERVER_INSTANCE_NAME = process.env.K_SERVICE || 'local';
const SERVER_DISPLAY_NAME = 'Number Guessing Game';

// =================================================================
// --- Session Lifecycle Management ---
// =================================================================

/**
 * Cleans up all in-memory objects associated with a finished or disconnected user session.
 */
function destroySession(transportSessionId: string): void {
  console.log(
    `[Controller] Destroying all objects for session: ${transportSessionId}`,
  );
  activeTransports.delete(transportSessionId);
  activeServers.delete(transportSessionId);
  activeContexts.delete(transportSessionId);
}

// =================================================================
// --- Express Request Handlers ---
// =================================================================

/**
 * This is the single, universal handler for all GET and POST requests to /mcp.
 * It authenticates the user, then routes to an existing session or creates a new one.
 */
const handleMcpRequest: RequestHandler = async (req, res) => {
  let transport: StreamableHTTPServerTransport | undefined;
  const userId = req.auth?.extra?.user_id as string | undefined;

  if (!userId) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Authentication required.' },
      id: req.body?.id ?? null,
    });
    return;
  }

  try {
    const sessionIdFromHeader = req.headers['mcp-session-id'] as
      | string
      | undefined;

    if (sessionIdFromHeader && !activeTransports.has(sessionIdFromHeader)) {
      // --- PATH FOR INVALID OR MISSING SESSIONS ---
      // The session ID is provided but no transport exists for it.
      console.warn(
        `[Controller] Session ID ${sessionIdFromHeader} provided but no active transport found. Cleaning up...`,
      );
      destroySession(sessionIdFromHeader);

      // Signals for the client to create a new session.
      res.status(404).send('Invalid or missing session ID');
      return;
    } else if (
      sessionIdFromHeader &&
      activeTransports.has(sessionIdFromHeader)
    ) {
      // --- PATH FOR EXISTING SESSIONS ---
      // A transport already exists, so we just retrieve it.
      transport = activeTransports.get(sessionIdFromHeader)!;
    } else if (isInitializeRequest(req.body)) {
      // --- PATH FOR NEW SESSIONS ---
      console.log(
        `[Controller] Received initialize request for user ${userId}. Creating new session stack...`,
      );

      // 1. Create the server and transport instances.
      const server = new McpServer(createMcpServerOptions());
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(), // Use a new UUID as the session ID
        onsessioninitialized: async (transportSessionId) => {
          try {
            console.log(
              `[Controller] Session initialized by SDK for user ${userId}. Storing objects.`,
            );
            activeTransports.set(transportSessionId, transport!);
            activeServers.set(transportSessionId, server);

            const context = await GameContext.create(
              userId,
              transportSessionId,
              sessionService,
              mcpEntities,
              SERVER_INSTANCE_NAME,
            );
            activeContexts.set(transportSessionId, context);

            context.initializeStateLogic(); // Set initial UI state
            console.log(
              `[Controller] Full initialization complete for user ${userId}.`,
            );
          } catch (error) {
            console.error(
              `[Controller] CRITICAL ERROR during session setup for ${userId}:`,
              error,
            );
            // Clean up any partially created objects.
            destroySession(transportSessionId);
          }
        },
      });

      // 2. Register all tools and resources on the new server BEFORE connecting.
      const sessionService = new GameSessionService(db);
      const mcpEntities: McpEntities = {
        server: server,
        startGameTool: null,
        guessNumberTool: null,
        giveUpTool: null,
        gameStateResource: null,
        highscoresResource: null,
        bannerImageResource: null,
        gameRulesResource: null,
        simpleHtmlPageResource: null,
      };
      const BASE_URI = `mcp://${SERVER_DISPLAY_NAME.toLowerCase().replaceAll(' ', '-')}`;

      mcpEntities.startGameTool = setupStartGameTool(
        server,
        sessionService,
        mcpEntities,
        SERVER_INSTANCE_NAME,
      );
      mcpEntities.guessNumberTool = setupGuessNumberTool(
        server,
        sessionService,
        mcpEntities,
        SERVER_INSTANCE_NAME,
      );
      mcpEntities.giveUpTool = setupGiveUpTool(
        server,
        sessionService,
        mcpEntities,
        SERVER_INSTANCE_NAME,
      );
      mcpEntities.gameStateResource = setupGameStateResource(
        server,
        sessionService,
        mcpEntities,
        SERVER_INSTANCE_NAME,
        `${BASE_URI}/game_state`,
      );
      mcpEntities.highscoresResource = setupHighscoresResource(
        server,
        sessionService,
        `${BASE_URI}/highscores`,
      );
      mcpEntities.bannerImageResource = setupBannerImageResource(
        server,
        `${BASE_URI}/banner`,
      );
      mcpEntities.gameRulesResource = setupGameRulesResource(
        server,
        `${BASE_URI}/rules`,
      );
      mcpEntities.simpleHtmlPageResource = setupSimpleHtmlPageResource(
        server,
        `${BASE_URI}/simple_interactive_page`,
      );

      // 4. Define the cleanup logic.
      transport.onclose = () => {
        console.log(
          `[Controller] Transport closed for user ${userId}. Cleaning up...`,
        );
        destroySession(userId);
      };

      // 5. Connect the server and transport. This "locks" the server's capabilities.
      await server.connect(transport);
    } else {
      // Signals for the client to create a new session.
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    // 6. Handle the HTTP request. This will trigger the `onsessioninitialized` callback at the correct time.
    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error(
      `[Controller] Error in main handler for user ${userId}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(500).json({
        error: { message: 'Internal Server Error: ' + error.message },
      });
    }
  }
};

// Route all relevant requests to the single, universal handler.
export const handleMcpPost = handleMcpRequest;
export const handleMcpSessionManagement = handleMcpRequest;
