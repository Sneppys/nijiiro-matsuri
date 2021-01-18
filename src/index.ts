import * as discord from "discord.js";
import * as config from "./bot.config.json";
import { CommandClient, OptionType, ResponseType } from "./commands/api";

const client = new discord.Client();
const cmd = new CommandClient(client, config.guild);

client.once("ready", async () => {
  cmd.postCommand({
    name: "testcommand",
    description: "Command description",
    options: [
      {
        name: "user",
        description: "User",
        type: OptionType.USER,
      },
    ],
  });

  cmd.on("testcommand", async (event) => {
    const userId = event.options.user as string;
    return {
      type: ResponseType.MESSAGE,
      data: {
        content: `User ID: ${userId}`,
      },
    };
  });

  console.log("Ready!");
});

client.login(config.token);
