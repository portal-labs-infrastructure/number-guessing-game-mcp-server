import { IGameState } from './game-state.interface';
import { GameContext } from '../core/game-context';
import { PlayingState } from './playing.state';
import {
  MAX_ATTEMPTS,
  GUESS_RANGE_MIN,
  GUESS_RANGE_MAX,
} from '../utils/game-constants';
import { CommandResult } from '../core/game-types';

export class LobbyState implements IGameState {
  async enter(context: GameContext): Promise<void> {
    if (
      context.mcpEntities.startGameTool &&
      !context.mcpEntities.startGameTool.enabled
    ) {
      context.mcpEntities.startGameTool.enable();
    }
    if (
      context.mcpEntities.guessNumberTool &&
      context.mcpEntities.guessNumberTool.enabled
    ) {
      context.mcpEntities.guessNumberTool.disable();
    }
    if (
      context.mcpEntities.giveUpTool &&
      context.mcpEntities.giveUpTool.enabled
    ) {
      context.mcpEntities.giveUpTool.disable();
    }
    // NEW: Explicitly clear the game state in Firestore when entering the lobby.
    await context.updateAndPersistGame(null);
    console.log(
      `[LobbyState-${context['serverInstanceName']}] Entered. Start game tool enabled.`,
    );
  }

  exit(context: GameContext): void {
    if (
      context.mcpEntities.startGameTool &&
      context.mcpEntities.startGameTool.enabled
    ) {
      context.mcpEntities.startGameTool.disable();
    }
    console.log(
      `[LobbyState-${context['serverInstanceName']}] Exited. Start game tool disabled.`,
    );
  }

  async startGame(
    context: GameContext,
    playerName: string,
  ): Promise<CommandResult> {
    const targetNumber =
      Math.floor(Math.random() * GUESS_RANGE_MAX) + GUESS_RANGE_MIN;

    const newGame = {
      playerName,
      targetNumber,
      attemptsLeft: MAX_ATTEMPTS,
      minGuess: GUESS_RANGE_MIN,
      maxGuess: GUESS_RANGE_MAX,
      lastMessage: `Welcome, ${playerName}! Guess ${GUESS_RANGE_MIN}-${GUESS_RANGE_MAX}. ${MAX_ATTEMPTS} attempts.`,
    };

    // NEW: Persist the new game state to Firestore before transitioning.
    await context.updateAndPersistGame(newGame);

    console.log(
      `[LobbyState-${context['serverInstanceName']}] Game started for ${playerName}. Target: ${targetNumber}`,
    );

    // NEW: Await the transition, as it's now an async operation.
    await context.transitionTo(new PlayingState());

    return {
      content: [{ type: 'text', text: newGame.lastMessage }],
    };
  }

  async makeGuess(context: GameContext, guess: number): Promise<CommandResult> {
    return {
      content: [
        {
          type: 'text',
          text: "Error: Game has not started yet. Use 'start_game'.",
        },
      ],
    };
  }

  async giveUp(context: GameContext): Promise<CommandResult> {
    return {
      content: [{ type: 'text', text: 'Error: No active game to give up.' }],
    };
  }

  getGameStateUIData(context: GameContext): object | null {
    return null;
  }
}
