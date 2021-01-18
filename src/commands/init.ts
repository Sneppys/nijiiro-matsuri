import { CommandClient } from "./api";
import * as AwardUser from "./static/awarduser";
import * as Check from "./static/check";

/**
 * Initializes any commands that are always present and registers their handlers
 * @param cmd The command client
 */
export function initializeStaticCommands(cmd: CommandClient) {
  AwardUser.initialize(cmd);
  Check.initialize(cmd);
}
