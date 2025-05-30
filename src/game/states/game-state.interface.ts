import { GameContext } from '../core/game-context';
import { CommandResult } from '../core/game-types';

export interface IGameState {
  // Lifecycle
  enter(context: GameContext): void;
  exit(context: GameContext): void;

  // Actions - these will be called by commands
  startGame(context: GameContext, playerName: string): Promise<CommandResult>;
  makeGuess(context: GameContext, guess: number): Promise<CommandResult>;
  giveUp(context: GameContext): Promise<CommandResult>;

  // For resource getters
  getGameStateUIData(context: GameContext): object | null;
}