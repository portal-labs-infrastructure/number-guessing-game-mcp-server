import { ICommand } from './command.interface';
import { GameContext } from '../core/game-context';
import { CommandResult } from '../core/game-types';

interface StartGamePayload {
  playerName: string;
}

export class StartGameCommand implements ICommand {
  constructor(
    private context: GameContext,
    private payload: StartGamePayload,
  ) {}

  async execute(): Promise<CommandResult> {
    return await this.context.startGame(this.payload.playerName);
  }
}
