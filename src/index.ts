import * as discord from "discord.js";
import * as config from "./bot.config.json";
import { CommandClient } from "./commands/api";
import { initializeStaticCommands } from "./commands/init";
import { initializeConnection } from "./database/connection";

const client = new discord.Client();
const cmd = new CommandClient(client, config.guild);

client.once("ready", async () => {
  // initialize the database connection
  initializeConnection();

  // initialize commands that are always present
  initializeStaticCommands(cmd);

  console.log("Ready!");
});

client.login(config.token);
