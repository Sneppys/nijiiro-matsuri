import * as discord from "discord.js";
import * as config from "./bot.config.json";
import { CommandClient } from "./commands";

const client = new discord.Client();
const cmd = new CommandClient(client, config.guild);

client.once("ready", async () => {
  console.log("Ready!");
});

client.login(config.token);
