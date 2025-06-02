import {
  McpServer,
  RegisteredResource,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

export interface HighScoreEntry {
  playerName: string;
  attempts: number;
}

export interface ActiveGame {
  playerName: string;
  targetNumber: number;
  attemptsLeft: number;
  minGuess: number;
  maxGuess: number;
  lastMessage: string;
}

export interface McpEntities {
  server: McpServer;
  highscoresResource: RegisteredResource | null;
  gameStateResource: RegisteredResource | null;
  gameRulesResource: RegisteredResource | null;
  bannerImageResource: RegisteredResource | null;
  simpleHtmlPageResource: RegisteredResource | null;

  startGameTool: RegisteredTool | null;
  guessNumberTool: RegisteredTool | null;
  giveUpTool: RegisteredTool | null;
}

export interface CommandResult extends CallToolResult {}
