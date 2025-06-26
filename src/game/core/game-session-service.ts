import { GameSession, HighScoreEntry } from './game-types';
import { SHARED_HIGH_SCORES } from '../utils/game-constants';
import { LobbyState } from '../states/lobby.state';
import { Firestore, Timestamp, Transaction } from '@google-cloud/firestore';

const SESSIONS_COLLECTION = 'game_sessions';
const GLOBAL_STATE_COLLECTION = 'global_state';
const HIGH_SCORES_DOC = 'high_scores';

/**
 * Manages game state persistence in Firestore.
 * This service is the single source of truth for all session and high score data.
 */
export class GameSessionService {
  private db: Firestore;

  constructor(firestoreInstance: Firestore) {
    this.db = firestoreInstance;
  }

  /**
   * Retrieves a game session for a given session ID.
   * If no session exists, it creates and returns a new one in a default (Lobby) state.
   * @param sessionId The unique identifier for the user's session.
   * @returns A promise that resolves to the GameSession object.
   */
  public async getSession(sessionId: string): Promise<GameSession> {
    const docRef = this.db.collection(SESSIONS_COLLECTION).doc(sessionId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      // We have a session, let's return it.
      return docSnap.data() as GameSession;
    } else {
      // No session found. Create a new one for this user.
      console.log(
        `[GameSessionService] No session for ${sessionId}, creating new one.`,
      );
      const newSession: GameSession = {
        id: sessionId,
        stateName: LobbyState.name, // Default state is Lobby
        currentGame: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await docRef.set(newSession);
      return newSession;
    }
  }

  /**
   * Updates a game session document in Firestore.
   * @param sessionId The ID of the session to update.
   * @param data A partial object of the GameSession data to update.
   * @returns A promise that resolves when the update is complete.
   */
  public async updateSession(
    sessionId: string,
    data: Partial<Omit<GameSession, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const docRef = this.db.collection(SESSIONS_COLLECTION).doc(sessionId);
    await docRef.update({
      ...data,
      updatedAt: Timestamp.now(), // Always update the timestamp
    });
  }

  /**
   * Deletes a game session document. Useful for cleanup.
   * @param sessionId The ID of the session to delete.
   */
  public async deleteSession(sessionId: string): Promise<void> {
    await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).delete();
  }

  /**
   * Retrieves the global high scores list.
   * If it doesn't exist, it initializes it with default values.
   * @returns A promise that resolves to an array of HighScoreEntry.
   */
  public async getHighScores(): Promise<HighScoreEntry[]> {
    const docRef = this.db
      .collection(GLOBAL_STATE_COLLECTION)
      .doc(HIGH_SCORES_DOC);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return (docSnap.data() as { scores: HighScoreEntry[] }).scores;
    } else {
      // High scores not initialized yet, let's create the document.
      console.log('[GameSessionService] Initializing high scores document.');
      await docRef.set({ scores: SHARED_HIGH_SCORES });
      return SHARED_HIGH_SCORES;
    }
  }

  /**
   * Adds a new high score entry if it qualifies.
   * This operation is performed within a Firestore transaction to ensure atomicity.
   * @param newEntry The new high score to potentially add.
   * @returns A promise that resolves when the transaction is complete.
   */
  public async addHighScore(newEntry: HighScoreEntry): Promise<void> {
    const docRef = this.db
      .collection(GLOBAL_STATE_COLLECTION)
      .doc(HIGH_SCORES_DOC);

    await this.db.runTransaction(async (transaction: Transaction) => {
      const docSnap = await transaction.get(docRef);
      const currentScores = docSnap.exists
        ? (docSnap.data() as { scores: HighScoreEntry[] }).scores
        : SHARED_HIGH_SCORES;

      // Add the new score, sort, and truncate to the top 10
      const updatedScores = [...currentScores, newEntry]
        .sort((a, b) => a.attempts - b.attempts)
        .slice(0, 10);

      transaction.set(docRef, { scores: updatedScores });
    });
    console.log(
      `[GameSessionService] Updated high scores with new entry for ${newEntry.playerName}.`,
    );
  }
}
