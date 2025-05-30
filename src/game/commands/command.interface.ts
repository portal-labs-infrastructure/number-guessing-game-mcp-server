import { CommandResult } from '../core/game-types';

export interface ICommand {
  execute(): Promise<CommandResult>;
}