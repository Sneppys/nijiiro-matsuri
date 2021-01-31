import { isOrganizer } from "../../util/checks";
import { CommandClient, OptionType, CommandOption } from "../api";
import { GameController } from "../../games/controller";

export function initialize(cmd: CommandClient, games: GameController) {
  const GAME_OPT: CommandOption = {
    type: OptionType.STRING,
    name: "game",
    description: "The game to control",
    choices: [{ name: "Screenshot Game", value: "screenshot" }],
    required: true,
  };

  cmd.postCommand({
    name: "org-gamestart",
    description: "[Organizer Only] Start a game",
    options: [
      GAME_OPT,
      {
        type: OptionType.INTEGER,
        name: "session",
        description: "The session number to start",
        required: true,
      },
    ],
  });
  cmd.on("org-gamestart", async (event) => {
    if (!isOrganizer(event.userId)) return;

    let game = event.options.game as string;
    let session = event.options.session as number;

    if (game === "screenshot") {
      games.screenshotGame.start(session);
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
      games.screenshotGame.stop();
    }
  });
}
