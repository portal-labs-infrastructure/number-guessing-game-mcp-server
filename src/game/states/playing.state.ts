import { IGameState } from './game-state.interface';
import { GameContext } from '../core/game-context';
import { LobbyState } from './lobby.state';
import { CommandResult } from '../core/game-types';
import { MAX_ATTEMPTS } from '../utils/game-constants';

export class PlayingState implements IGameState {
  enter(context: GameContext): void {
    if (context.mcpEntities.guessNumberTool)
      context.mcpEntities.guessNumberTool.enable();
    if (context.mcpEntities.giveUpTool) context.mcpEntities.giveUpTool.enable();

    // gameStateResource is added by the event listener in mcp_setup.
    // This 'enter' method should ensure the content of that resource is correct.
    if (context.currentGame) {
      context.updateGuessToolSchema(
        context.currentGame.minGuess,
        context.currentGame.maxGuess,
        context.currentGame.attemptsLeft,
      );
      context.signalGameStateContentUpdate(); // Push initial/current game state to the (now existing) resource
    }
    console.log(
      `[PlayingState-${context['serverInstanceName']}] Entered. Game tools active.`,
    );
  }

  exit(context: GameContext): void {
    if (context.mcpEntities.guessNumberTool)
      context.mcpEntities.guessNumberTool.disable();
    if (context.mcpEntities.giveUpTool)
      context.mcpEntities.giveUpTool.disable();
    // gameStateResource removal handled by event listener
    console.log(
      `[PlayingState-${context['serverInstanceName']}] Exited. Game tools disabled.`,
    );
  }

  startGame(context: GameContext, playerName: string): Promise<CommandResult> {
    return Promise.resolve({
      content: [
        {
          type: 'text',
          text: "Error: Game is already in progress. Use 'make_guess' or 'give_up'.",
        },
      ],
    });
  }

  async makeGuess(context: GameContext, guess: number): Promise<CommandResult> {
    if (!context.currentGame) {
      context.transitionTo(new LobbyState());
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No game in progress. Returning to lobby.',
          },
        ],
      };
    }

    context.currentGame.attemptsLeft--;
    let message = '';
    let gameWon = false;
    let gameOver = false;

    if (guess === context.currentGame.targetNumber) {
      const attemptsTaken = MAX_ATTEMPTS - context.currentGame.attemptsLeft;
      message = `🎉 Congrats, ${context.currentGame.playerName}! Guessed ${context.currentGame.targetNumber} in ${attemptsTaken} attempts! 🎉`;
      context.highScores.push({
        playerName: context.currentGame.playerName,
        attempts: attemptsTaken,
      });
      context.signalHighScoresContentUpdate(); // Triggers highscoresResource.update({})
      gameWon = true;
      gameOver = true;
    } else if (context.currentGame.attemptsLeft === 0) {
      message = `Game Over, ${context.currentGame.playerName}. Number was ${context.currentGame.targetNumber}.`;
      gameOver = true;
    } else {
      context.currentGame.minGuess =
        guess < context.currentGame.targetNumber
          ? Math.max(context.currentGame.minGuess, guess + 1)
          : context.currentGame.minGuess;
      context.currentGame.maxGuess =
        guess > context.currentGame.targetNumber
          ? Math.min(context.currentGame.maxGuess, guess - 1)
          : context.currentGame.maxGuess;
      message = `${guess < context.currentGame.targetNumber ? 'Too low' : 'Too high'}! ${context.currentGame.attemptsLeft} attempts left.`;
    }
    context.currentGame.lastMessage = message;
    context.signalGameStateContentUpdate(); // Triggers gameStateResource.update({})

    if (gameOver) {
      context.transitionTo(new LobbyState());
    } else {
      context.updateGuessToolSchema(
        context.currentGame.minGuess,
        context.currentGame.maxGuess,
        context.currentGame.attemptsLeft,
      );
    }
    return { content: [{ type: 'text', text: message }] };
  }

  async giveUp(context: GameContext): Promise<CommandResult> {
    if (!context.currentGame) {
      context.transitionTo(new LobbyState());
      return {
        content: [{ type: 'text', text: 'Error: No game to give up.' }],
      };
    }
    const message = `Game over. ${context.currentGame.playerName} gave up. Number was ${context.currentGame.targetNumber}.`;
    context.currentGame.lastMessage = message;
    context.signalGameStateContentUpdate(); // Send final message
    context.transitionTo(new LobbyState());
    return { content: [{ type: 'text', text: message }] };
  }

  getGameStateUIData(context: GameContext): object | null {
    if (!context.currentGame) return null;
    return {
      attemptsLeft: context.currentGame.attemptsLeft,
      minGuess: context.currentGame.minGuess,
      maxGuess: context.currentGame.maxGuess,
      message: context.currentGame.lastMessage,
    };
  }
}
