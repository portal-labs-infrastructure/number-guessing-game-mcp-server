import { IGameState } from '../states/game-state.interface';
import { LobbyState } from '../states/lobby.state';
import { PlayingState } from '../states/playing.state';
import { ActiveGame, McpEntities, HighScoreEntry } from './game-types';
import { z } from 'zod';
import { GameSessionService } from './game-session-service';

const stateClassMap: { [key: string]: new () => IGameState } = {
  [LobbyState.name]: LobbyState,
  [PlayingState.name]: PlayingState,
};

export class GameContext {
  private _currentState!: IGameState;
  public currentGame: ActiveGame | null = null;
  public highScores: HighScoreEntry[] = [];

  public readonly mcpEntities: McpEntities;
  public readonly userId: string;
  public readonly sessionId: string;
  private readonly sessionService: GameSessionService;
  private readonly serverInstanceName: string;

  private constructor(
    userId: string,
    sessionId: string,
    sessionService: GameSessionService,
    mcpEntities: McpEntities,
    serverInstanceName: string,
  ) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.sessionService = sessionService;
    this.mcpEntities = mcpEntities;
    this.serverInstanceName = serverInstanceName;
  }

  public static async create(
    userId: string,
    sessionId: string,
    sessionService: GameSessionService,
    mcpEntities: McpEntities,
    serverInstanceName: string,
  ): Promise<GameContext> {
    const context = new GameContext(
      userId,
      sessionId,
      sessionService,
      mcpEntities,
      serverInstanceName,
    );
    await context.loadState();
    return context;
  }

  private async loadState(): Promise<void> {
    console.log(
      `[GameContext-${this.serverInstanceName}] Loading state for session: ${this.sessionId}`,
    );
    const [session, highScores] = await Promise.all([
      this.sessionService.getSession(this.sessionId),
      this.sessionService.getHighScores(),
    ]);

    this.currentGame = session.currentGame;
    this.highScores = highScores;

    const StateClass = stateClassMap[session.stateName];
    if (!StateClass) {
      throw new Error(
        `Unknown state name loaded from DB: ${session.stateName}`,
      );
    }
    this._currentState = new StateClass();
  }

  public initializeStateLogic(): void {
    // This method now only calls enter(). The emit is gone.
    this._currentState.enter(this);
  }

  public getCurrentState(): IGameState {
    return this._currentState;
  }

  public async transitionTo(state: IGameState): Promise<void> {
    const oldStateName = this._currentState.constructor.name;
    const newStateName = state.constructor.name;
    console.log(
      `[GameContext-${this.serverInstanceName}] Transitioning from ${oldStateName} to ${newStateName} for session ${this.sessionId}`,
    );

    this._currentState.exit(this);
    this._currentState = state;

    await this.sessionService.updateSession(this.sessionId, {
      stateName: newStateName,
    });

    this._currentState.enter(this);
  }

  // This method now persists the new game state to Firestore
  public async updateAndPersistGame(
    gameData: ActiveGame | null,
  ): Promise<void> {
    this.currentGame = gameData;
    await this.sessionService.updateSession(this.sessionId, {
      currentGame: gameData,
    });
    this.signalGameStateContentUpdate();
  }

  // This method now persists the new high score to Firestore
  public async addNewHighScore(entry: HighScoreEntry): Promise<void> {
    await this.sessionService.addHighScore(entry);
    // Reload high scores to reflect the change immediately
    this.highScores = await this.sessionService.getHighScores();
    this.signalHighScoresContentUpdate();
  }

  // --- The rest of the methods mostly delegate or remain the same ---

  public getHighScoresData(): HighScoreEntry[] {
    return [...this.highScores]
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, 10);
  }

  public getGameStateData(): ActiveGame | null {
    return this.currentGame ? { ...this.currentGame } : null;
  }

  public getGameStateUIDataForResource(): object | null {
    return this._currentState.getGameStateUIData(this);
  }

  public signalGameStateContentUpdate(): void {
    if (this.mcpEntities.gameStateResource) {
      this.mcpEntities.gameStateResource.update({});
    }
  }

  public signalHighScoresContentUpdate(): void {
    if (this.mcpEntities.highscoresResource) {
      this.mcpEntities.highscoresResource.update({});
    }
  }

  public updateGuessToolSchema(
    minGuess: number,
    maxGuess: number,
    currentAttempts: number,
  ): void {
    // This logic remains the same as it affects runtime MCP objects
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
    }
  }

  // These methods must now be async as they trigger DB writes
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
