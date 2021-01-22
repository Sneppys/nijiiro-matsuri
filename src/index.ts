import * as discord from "discord.js";
import * as config from "./bot.config.json";
import { CommandClient } from "./commands/api";
import { initializeStaticCommands } from "./commands/init";
import { initializeConnection } from "./database/connection";
import { GameController } from "./games/controller";

const client = new discord.Client();
const cmd = new CommandClient(client, config.guild);
const games = new GameController(
  client,
  cmd,
  config.guild,
  config.channels.games
);

client.once("ready", async () => {
  // initialize the database connection
  initializeConnection();

  // start game controller
  await games.initialize();

  // initialize commands that are always present
  await initializeStaticCommands(cmd, games);

  console.log("Ready!");
});

client.login(config.token);
