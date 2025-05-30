import { ICommand } from './command.interface';
import { GameContext } from '../core/game-context';
import { CommandResult } from '../core/game-types';

export class GiveUpCommand implements ICommand {
  constructor(private context: GameContext) {}

  async execute(): Promise<CommandResult> {
    return this.context.giveUp();
  }
}