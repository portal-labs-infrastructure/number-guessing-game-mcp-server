import { ICommand } from './command.interface';
import { GameContext } from '../core/game-context';
import { CommandResult } from '../core/game-types';

interface GuessNumberPayload {
  guess: number;
}

export class GuessNumberCommand implements ICommand {
  constructor(
    private context: GameContext,
    private payload: GuessNumberPayload,
  ) {}

  async execute(): Promise<CommandResult> {
    return await this.context.makeGuess(this.payload.guess);
  }
}
