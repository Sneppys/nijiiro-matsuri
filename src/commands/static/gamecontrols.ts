import { isOrganizer } from "../../util/checks";
import { CommandClient, OptionType, CommandOption } from "../api";
import { GameController } from "../../games/controller";

export function initialize(cmd: CommandClient, games: GameController) {
  const GAME_OPT: CommandOption = {
    type: OptionType.STRING,
    name: "game",
    description: "The game to control",
    choices: [{ name: "Screenshot Game", value: "screenshot" }],
  };

  cmd.postCommand({
    name: "org-gamestart",
    description: "[Organizer Only] Start a game",
    options: [GAME_OPT],
  });
  cmd.on("org-gamestart", async (event) => {
    if (!isOrganizer(event.userId)) return;

    let game = event.options.game as string;

    if (game === "screenshot") {
      await games.screenshotGame.start();
    }
  });

  cmd.postCommand({
    name: "org-gamestop",
    description: "[Organizer Only] Stop a game",
    options: [GAME_OPT],
  });
  cmd.on("org-gamestop", async (event) => {
    if (!isOrganizer(event.userId)) return;

    let game = event.options.game as string;

    if (game === "screenshot") {
      await games.screenshotGame.stop();
    }
  });
}
