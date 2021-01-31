import * as discord from "discord.js";
import { CommandClient } from "../commands/api";

export class GameManager {
  client: discord.Client;
  cmd: CommandClient;
  guildId: string;
  channelId: string;
  logChannelId: string;

  active: boolean;
  session: number;
  tickRate = 0;

  logName = "Game";

  constructor(
    client: discord.Client,
    cmd: CommandClient,
    guildId: string,
    channelId: string,
    logChannelId: string
  ) {
    this.client = client;
    this.cmd = cmd;
    this.guildId = guildId;
    this.channelId = channelId;
    this.logChannelId = logChannelId;

    this.active = false;
    this.session = 0;
  }

  /**
   * Initialize anything that needs to be initialized
   */
  async initialize() {}

  /**
   * Start the game
   * @param session The session to start
   * @returns true if the game successfully started
   */
  async start(session: number): Promise<boolean> {
    if (this.active) {
      return false;
    }
    this.active = true;
    this.session = session;
    this.startTicking();
    return true;
  }

  /**
   * Stop the game
   * @returns true if the game successfully stopped
   */
  async stop(): Promise<boolean> {
    if (!this.active) {
      return false;
    }
    this.active = false;
    return true;
  }

  /**
   * Scheduled method that runs every `tickRate` milliseconds
   */
  async tick() {
    if (this.active && this.tickRate > 0) {
      setTimeout(this.tick.bind(this), this.tickRate);
    }
  }

  /**
   * Start ticking the `tick` method
   */
  startTicking() {
    setTimeout(this.tick.bind(this), 1000);
  }

  /**
   * Stop ticking the `tick` method after the next run
   */
  stopTicking() {
    this.tickRate = 0;
  }

  /**
   * Get the associated guild
   */
  async getGuild(): Promise<discord.Guild> {
    return await this.client.guilds.fetch(this.guildId);
  }

  /**
   * Get the text channel object that the game is running in
   */
  async getChannel(): Promise<discord.TextChannel | discord.NewsChannel> {
    let guild = await this.getGuild();
    let channel = guild.channels.resolve(this.channelId);
    if (channel != null && channel.isText()) {
      return channel;
    }
    throw Error(
      `Channel ID '${this.channelId}' in guild '${this.guildId}' returns a null or non-text channel`
    );
  }

  /**
   * Get the channel used for bot logging
   */
  async getLogChannel(): Promise<discord.TextChannel | discord.NewsChannel> {
    let guild = await this.getGuild();
    let channel = guild.channels.resolve(this.logChannelId);
    if (channel != null && channel.isText()) {
      return channel;
    }
    throw Error(
      `Logging Channel ID '${this.logChannelId}' in guild '${this.guildId}' returns a null or non-text channel`
    );
  }

  /**
   * Log a message to the logging channel
   * @param content The message to log
   */
  async log(content: string) {
    let ch = await this.getLogChannel();
    return await ch.send(`[**${this.logName}**] ${content}`);
  }
}
