import { CommandClient } from "./api";
import * as AwardUser from "./static/awarduser";
import * as Check from "./static/check";
import * as GameControls from "./static/gamecontrols";
import { GameController } from "../games/controller";

/**
 * Initializes any commands that are always present and registers their handlers
 * @param cmd The command client
 */
export async function initializeStaticCommands(
  cmd: CommandClient,
  games: GameController
) {
  await deleteExisting(cmd);
  AwardUser.initialize(cmd);
  Check.initialize(cmd);
  GameControls.initialize(cmd, games);
}

/**
 * Delete all existing commands on the client, to clean up
 * @param cmd The command client
 */
async function deleteExisting(cmd: CommandClient) {
  const cmds = await cmd.getCommands();
  for (let c of cmds) {
    await cmd.deleteCommand(c.id);
  }
}
