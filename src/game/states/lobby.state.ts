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
  enter(context: GameContext): void {
    if (!context.mcpEntities.startGameTool) {
      console.error(
        `[LobbyState-${context['serverInstanceName']}] Start game tool not found in MCP entities.`,
      );
      return;
    }
    context.mcpEntities.startGameTool.enable();
    if (context.mcpEntities.guessNumberTool)
      context.mcpEntities.guessNumberTool.disable();
    if (context.mcpEntities.giveUpTool)
      context.mcpEntities.giveUpTool.disable();
    context.currentGame = null;
    // gameStateResource removal is handled by the event listener in mcp_setup
    console.log(
      `[LobbyState-${context['serverInstanceName']}] Entered. Start game tool enabled.`,
    );
  }

  exit(context: GameContext): void {
    if (!context.mcpEntities.startGameTool) {
      console.error(
        `[LobbyState-${context['serverInstanceName']}] Start game tool not found in MCP entities.`,
      );
      return;
    }
    context.mcpEntities.startGameTool.disable();
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
    context.currentGame = {
      playerName,
      targetNumber,
      attemptsLeft: MAX_ATTEMPTS,
      minGuess: GUESS_RANGE_MIN,
      maxGuess: GUESS_RANGE_MAX,
      lastMessage: `Welcome, ${playerName}! Guess ${GUESS_RANGE_MIN}-${GUESS_RANGE_MAX}. ${MAX_ATTEMPTS} attempts.`,
    };
    console.log(
      `[LobbyState-${context['serverInstanceName']}] Game started for ${playerName}. Target: ${targetNumber}`,
    );
    context.transitionTo(new PlayingState()); // This will trigger event for resource creation
    return {
      content: [{ type: 'text', text: context.currentGame.lastMessage }],
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
