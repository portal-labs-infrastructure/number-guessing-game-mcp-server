import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GameContext } from '../game/core/game-context';
import { McpEntities } from '../game/core/game-types';

import {
  setupStartGameTool,
  setupGuessNumberTool,
  setupGiveUpTool,
} from './tools';
import { setupHighscoresResource } from './resources';
import { setupGameStateChangeListener } from './event_handlers';

export function createGameServerInstance(): McpServer {
  const instanceTimestamp = Date.now();
  const serverNameSuffix = instanceTimestamp.toString().slice(-6);
  const serverName = `NumGuess-${serverNameSuffix}`;
  console.log(
    `[McpGameServer] Creating new MCP server instance: ${serverName}`,
  );

  const server = new McpServer({
    name: serverName,
    version: '2.2.1', // Reflects SDK corrections
    description: 'Number Guessing Game - SDK Corrected & Refactored',
  });

  const BASE_URI = `mcp://${serverName}`; // Use the generated serverName
  const HIGHSCORES_RESOURCE_URI_STRING = `${BASE_URI}/highscores`;
  const GAME_STATE_RESOURCE_URI_STRING = `${BASE_URI}/game_state`;

  const mcpEntities: McpEntities = {
    server, // Store the server instance here
    highscoresResource: null,
    gameStateResource: null,
    startGameTool: null,
    guessNumberTool: null,
    giveUpTool: null,
  };

  // Pass the serverName to GameContext for its internal logging
  const gameContext = new GameContext(mcpEntities, serverName);

  mcpEntities.startGameTool = setupStartGameTool(server, gameContext);
  mcpEntities.guessNumberTool = setupGuessNumberTool(server, gameContext);
  mcpEntities.giveUpTool = setupGiveUpTool(server, gameContext);

  mcpEntities.highscoresResource = setupHighscoresResource(
    server,
    gameContext,
    HIGHSCORES_RESOURCE_URI_STRING,
  );

  setupGameStateChangeListener(
    gameContext,
    mcpEntities,
    server, // Could also get from mcpEntities.server inside the handler
    GAME_STATE_RESOURCE_URI_STRING,
    serverName, // Pass serverName for logging consistency
  );

  gameContext.initializeStateLogic();

  return server;
}
