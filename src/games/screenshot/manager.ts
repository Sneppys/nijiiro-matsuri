import * as discord from "discord.js";
import { CommandClient, OptionType } from "../../commands/api";
import { isOrganizer } from "../../util/checks";
import * as gameConfig from "../games.config.json";
import * as snippetData from "./snippets.json";
import { Member } from "../../database/models/member";
import { initialize } from "../../commands/static/awarduser";

/**
 * Manager for the "guess the screenshot" game
 */
export class ScreenshotGameManager {
  active: boolean = false;
  client: discord.Client;
  cmd: CommandClient;
  guildId: string;
  channelId: string;

  constructor(
    client: discord.Client,
    cmd: CommandClient,
    guildId: string,
    channelId: string
  ) {
    this.client = client;
    this.cmd = cmd;
    this.guildId = guildId;
    this.channelId = channelId;
  }

  /**
   * Initialize anything that needs to be initialized
   */
  async initialize() {
    this.cmd.on("org-post", async (event) => {
      if (!isOrganizer(event.userId)) return;
      await this.postSnippet();
    });

    this.cmd.on("org-verify", async (event) => {
      if (!isOrganizer(event.userId)) return;
      let num = event.options.num as number;
      let userId = event.options.user as string;

      await this.verifyCorrect(num - 1, userId);
    });
  }

  /**
   * Start the game
   */
  async start() {
    if (this.active) return;

    let ch = await this.getChannel();
    if (!ch) {
      console.error("Cannot start screenshot game: null game channel");
      return;
    }

    await ch.send("Starting screenshot game!");

    await this.cmd.postCommand({
      name: "org-post",
      description: "[Organizer Only] Post a snippet",
    });

    await this.cmd.postCommand({
      name: "org-verify",
      description:
        "[Organizer Only] Verify a user won the guess for a given snippet",
      options: [
        {
          type: OptionType.INTEGER,
          name: "num",
          description: "Snippet number to verify result for",
        },
        {
          type: OptionType.USER,
          name: "user",
          description: "User that won the guess",
        },
      ],
    });

    this.active = true;
  }

  /**
   * Stop the game
   */
  async stop() {
    if (!this.active) return;

    let ch = await this.getChannel();

    await ch.send("Stopping screenshot game!");

    await this.cmd.deleteCommandByName("org-post");
    await this.cmd.deleteCommandByName("org-verify");

    this.active = false;
  }

  /**
   * Get the text channel object that the game is running in
   */
  async getChannel(): Promise<discord.TextChannel | discord.NewsChannel> {
    let guild = await this.client.guilds.fetch(this.guildId);
    let channel = guild.channels.resolve(this.channelId);
    if (channel != null && channel.isText()) {
      return channel;
    }
    throw Error(
      `Channel ID '${this.channelId}' in guild '${this.guildId}' returns a null or non-text channel`
    );
  }

  async postSnippet() {
    let ch = await this.getChannel();
    let index = Math.floor(Math.random() * SNIPPETS.length);
    let snippet = SNIPPETS[index];

    let embed = new discord.MessageEmbed({
      title: `Snippet #${index + 1}`,
      description: `Source: ${snippet.source}`,
      image: { url: `${gameConfig.screenshot.sourceUrl}${snippet.img}` },
    });
    await ch.send(embed);
  }

  async verifyCorrect(snipIndex: number, userId: string) {
    let ch = await this.getChannel();
    if (snipIndex in SNIPPETS) {
      let snip = SNIPPETS[snipIndex];

      let member = await Member.withId(userId);
      await member.givePoints(snip.reward);

      await ch.send(
        `[Snippet #${
          snipIndex + 1
        }] <@${userId}> posted the correct answer! (+${
          snip.reward
        } Event Points)`
      );
    }
  }
}

/**
 * Represents a screenshot that is to be guessed, imported from `snippets.json`
 */
export class Snippet {
  source: string;
  img: string;
  reward: number;

  constructor(source: string, img: string, reward: number) {
    this.source = source;
    this.img = img;
    this.reward = reward;
  }
}

const SNIPPETS: Snippet[] = snippetData.snippets;
