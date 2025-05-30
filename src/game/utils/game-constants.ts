import { HighScoreEntry } from "../core/game-types";

export const MAX_ATTEMPTS = 10;
export const GUESS_RANGE_MIN = 1;
export const GUESS_RANGE_MAX = 100;
export const SHARED_HIGH_SCORES: HighScoreEntry[] = [
  { playerName: "ServerBest", attempts: 2 },
  { playerName: "MCP Champ", attempts: 4 },
];