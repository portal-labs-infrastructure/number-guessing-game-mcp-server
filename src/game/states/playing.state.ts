import { IGameState } from './game-state.interface';
import { GameContext } from '../core/game-context';
import { LobbyState } from './lobby.state';
import { CommandResult } from '../core/game-types';
import { MAX_ATTEMPTS } from '../utils/game-constants';

export class PlayingState implements IGameState {
  enter(context: GameContext): void {
    if (
      context.mcpEntities.guessNumberTool &&
      !context.mcpEntities.guessNumberTool.enabled
    ) {
      context.mcpEntities.guessNumberTool.enable();
    }
    if (
      context.mcpEntities.giveUpTool &&
      !context.mcpEntities.giveUpTool.enabled
    ) {
      context.mcpEntities.giveUpTool.enable();
    }

    const game = context.getGameStateData();
    if (game) {
      context.updateGuessToolSchema(
        game.minGuess,
        game.maxGuess,
        game.attemptsLeft,
      );
      context.signalGameStateContentUpdate();
    }
    console.log(
      `[PlayingState-${context['serverInstanceName']}] Entered. Game tools active.`,
    );
  }

  exit(context: GameContext): void {
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
    console.log(
      `[PlayingState-${context['serverInstanceName']}] Exited. Game tools disabled.`,
    );
  }

  async startGame(
    context: GameContext,
    playerName: string,
  ): Promise<CommandResult> {
    return {
      content: [
        {
          type: 'text',
          text: "Error: Game is already in progress. Use 'make_guess' or 'give_up'.",
        },
      ],
    };
  }

  async makeGuess(context: GameContext, guess: number): Promise<CommandResult> {
    const game = context.getGameStateData();
    if (!game) {
      await context.transitionTo(new LobbyState());
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No game in progress. Returning to lobby.',
          },
        ],
      };
    }

    game.attemptsLeft--;
    let message = '';
    let gameOver = false;

    if (guess === game.targetNumber) {
      const attemptsTaken = MAX_ATTEMPTS - game.attemptsLeft;
      message = `🎉 Congrats, ${game.playerName}! Guessed ${game.targetNumber} in ${attemptsTaken} attempts! 🎉`;
      // NEW: Persist the new high score to Firestore.
      await context.addNewHighScore({
        playerName: game.playerName,
        attempts: attemptsTaken,
      });
      gameOver = true;
    } else if (game.attemptsLeft === 0) {
      message = `Game Over, ${game.playerName}. Number was ${game.targetNumber}.`;
      gameOver = true;
    } else {
      game.minGuess =
        guess < game.targetNumber
          ? Math.max(game.minGuess, guess + 1)
          : game.minGuess;
      game.maxGuess =
        guess > game.targetNumber
          ? Math.min(game.maxGuess, guess - 1)
          : game.maxGuess;
      message = `${guess < game.targetNumber ? 'Too low' : 'Too high'}! ${game.attemptsLeft} attempts left.`;
    }
    game.lastMessage = message;

    // NEW: Persist all game changes (attempts, min/max, message) to Firestore.
    await context.updateAndPersistGame(game);

    if (gameOver) {
      await context.transitionTo(new LobbyState());
    } else {
      // NEW DIAGNOSTIC CODE:
      const tool = context.mcpEntities.guessNumberTool;
      if (tool) {
        context.updateGuessToolSchema(
          game.minGuess,
          game.maxGuess,
          game.attemptsLeft,
        );
      }
    }
    return { content: [{ type: 'text', text: message }] };
  }

  async giveUp(context: GameContext): Promise<CommandResult> {
    const game = context.getGameStateData();
    if (!game) {
      await context.transitionTo(new LobbyState());
      return {
        content: [{ type: 'text', text: 'Error: No game to give up.' }],
      };
    }
    const message = `Game over. ${game.playerName} gave up. Number was ${game.targetNumber}.`;
    game.lastMessage = message;

    // NEW: Persist the final game state message before transitioning.
    await context.updateAndPersistGame(game);
    await context.transitionTo(new LobbyState());

    return { content: [{ type: 'text', text: message }] };
  }

  getGameStateUIData(context: GameContext): object | null {
    const game = context.getGameStateData();
    if (!game) return null;
    return {
      attemptsLeft: game.attemptsLeft,
      minGuess: game.minGuess,
      maxGuess: game.maxGuess,
      message: game.lastMessage,
    };
  }
}
