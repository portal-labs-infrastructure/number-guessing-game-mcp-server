import { EventEmitter } from 'events';
import { IGameState } from '../states/game-state.interface';
import { LobbyState } from '../states/lobby.state';
import { ActiveGame, McpEntities, HighScoreEntry } from './game-types';
import { SHARED_HIGH_SCORES } from '../utils/game-constants';
import { z } from 'zod';

export const GameContextEvents = {
  STATE_CHANGED: 'stateChanged',
};

export class GameContext extends EventEmitter {
  private _currentState: IGameState;
  public currentGame: ActiveGame | null = null;
  public readonly mcpEntities: McpEntities;
  public highScores: HighScoreEntry[];
  private readonly serverInstanceName: string; // Store the specific server name

  constructor(mcpEntities: McpEntities, serverInstanceName: string) {
    // Accept serverInstanceName
    super();
    this.mcpEntities = mcpEntities;
    this.serverInstanceName = serverInstanceName; // Use this for logging
    this.highScores = [...SHARED_HIGH_SCORES];
    this._currentState = new LobbyState();
  }

  public initializeStateLogic(): void {
    // This method is called by mcp-game-server AFTER listeners are attached.
    // 1. Emit event for the initial state, so listeners can set up resources.
    this.emit(GameContextEvents.STATE_CHANGED, {
      newState: this._currentState,
      context: this,
    });
    // 2. Now call enter() on the initial state.
    this._currentState.enter(this);
  }

  public getCurrentState(): IGameState {
    return this._currentState;
  }

  public transitionTo(state: IGameState): void {
    const oldStateName = this._currentState.constructor.name;
    console.log(
      `[GameContext-${this.serverInstanceName}] Transitioning from ${oldStateName} to ${state.constructor.name}`,
    );

    this._currentState.exit(this);
    this._currentState = state;

    // 1. Emit the event that the state has changed.
    // Listeners (like the resource manager) will react to this.
    this.emit(GameContextEvents.STATE_CHANGED, {
      newState: this._currentState,
      context: this,
    });

    // 2. Now, call the new state's enter() method.
    // By this time, listeners for STATE_CHANGED should have completed their synchronous work (like resource creation).
    this._currentState.enter(this);
  }

  public getHighScoresData(): HighScoreEntry[] {
    return [...this.highScores]
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, 10);
  }

  public getGameStateData(): ActiveGame | null {
    return this.currentGame ? { ...this.currentGame } : null;
  }

  public getGameStateUIDataForResource(): object | null {
    // Delegate to current state to get UI-specific data for the resource
    return this._currentState.getGameStateUIData(this);
  }

  public signalGameStateContentUpdate(): void {
    if (this.mcpEntities.gameStateResource) {
      this.mcpEntities.gameStateResource.update({});
      console.log(
        `[GameContext-${this.serverInstanceName}] Signaled game_state resource content update.`,
      );
    } else {
      console.warn(
        `[GameContext-${this.serverInstanceName}] Tried to signal game_state update, but resource is null.`,
      );
    }
  }

  public signalHighScoresContentUpdate(): void {
    if (this.mcpEntities.highscoresResource) {
      // Check if resource exists
      this.mcpEntities.highscoresResource.update({});
      console.log(
        `[GameContext-${this.serverInstanceName}] Signaled highscores resource content update.`,
      );
    }
  }

  public updateGuessToolSchema(
    minGuess: number,
    maxGuess: number,
    currentAttempts: number,
  ): void {
    if (this.mcpEntities.guessNumberTool) {
      this.mcpEntities.guessNumberTool.update({
        paramsSchema: {
          guess: z
            .number()
            .int()
            .min(minGuess)
            .max(maxGuess)
            .describe(
              `Your guess (${minGuess}-${maxGuess}). ${currentAttempts} attempts left.`,
            ),
        },
      });
      console.log(
        `[GameContext-${this.serverInstanceName}] Updated guess_number tool schema.`,
      );
    }
  }

  public async startGame(playerName: string) {
    return this._currentState.startGame(this, playerName);
  }

  public async makeGuess(guess: number) {
    return this._currentState.makeGuess(this, guess);
  }

  public async giveUp() {
    return this._currentState.giveUp(this);
  }
}
