import { CommandClient } from "./api";
import * as AwardUser from "./static/awarduser";
import * as Check from "./static/check";

/**
 * Initializes any commands that are always present and registers their handlers
 * @param cmd The command client
 */
export async function initializeStaticCommands(cmd: CommandClient) {
  await deleteExisting(cmd);
  AwardUser.initialize(cmd);
  Check.initialize(cmd);
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
