import * as discord from "discord.js";
import { CommandClient } from "../commands/api";
import { ScreenshotGameManager } from "./screenshot/manager";

/**
 * Controller for all the discord games run by the application
 */
export class GameController {
  client: discord.Client;
  cmd: CommandClient;
  guildId: string;
  gameChannelId: string;

  screenshotGame: ScreenshotGameManager;

  constructor(
    client: discord.Client,
    cmd: CommandClient,
    guildId: string,
    gameChannelId: string
  ) {
    this.client = client;
    this.cmd = cmd;
    this.guildId = guildId;
    this.gameChannelId = gameChannelId;

    this.screenshotGame = new ScreenshotGameManager(
      this.client,
      this.cmd,
      this.guildId,
      this.gameChannelId
    );
  }

  /**
   * Initialize any games that need to be initialized on startup
   */
  async initialize() {
    await this.screenshotGame.initialize();
  }
}
