import * as discord from "discord.js";
import { CommandClient, OptionType, ResponseType } from "../../commands/api";
import { Member } from "../../database/models/member";
import { isOrganizer } from "../../util/checks";
import * as gameConfig from "../games.config.json";
import * as snippetData from "./snippets.json";

/**
 * Manager for the "guess the screenshot" game
 */
export class ScreenshotGameManager {
  client: discord.Client;
  cmd: CommandClient;
  guildId: string;
  channelId: string;

  active: boolean = false;
  snippetSets: Array<SnippetSet> = [];
  cleanupFunctions: Array<Function> = [];
  correctUsers: Map<number, string> = new Map();

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
  async initialize() {}

  /**
   * Start the game
   */
  async start(session: number) {
    if (this.active) return;

    this.active = true;
    this.correctUsers = new Map();

    switch (session) {
      case 1:
        this.snippetSets = snippetData.session_1;
    }

    if (this.snippetSets.length === 0) {
      this.active = false;
      return;
    }

    let ch = await this.getChannel();
    if (!ch) {
      console.error("Cannot start screenshot game: null game channel");
      this.active = false;
      return;
    }

    await ch.send(`Starting screenshot game! (Session #${session})`);

    await this.cmd.postCommand({
      name: "org-post",
      description: "[Organizer Only] Post a snippet",
      options: [
        {
          type: OptionType.INTEGER,
          name: "num",
          description: "Snippet set index to post",
          required: true,
        },
      ],
    });
    let cleanupPost = this.cmd.on("org-post", async (event) => {
      if (!isOrganizer(event.userId)) return;

      let num = event.options.num as number;

      let set = this.snippetSets.find((s) => s.number === num);
      if (set) {
        let embed = new discord.MessageEmbed({
          title: `Snippet Set #${set.number}`,
          image: { url: `${gameConfig.screenshot.sourceUrl}${set.img}` },
        });
        if (embed) {
          return {
            type: ResponseType.MESSAGE,
            data: {
              content: "",
              embeds: [embed],
            },
          };
        }
      }
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
          required: true,
        },
        {
          type: OptionType.USER,
          name: "user",
          description: "User that won the guess",
          required: true,
        },
      ],
    });
    let cleanupVerify = this.cmd.on("org-verify", async (event) => {
      if (!isOrganizer(event.userId)) return;

      let num = event.options.num as number;
      let userId = event.options.user as string;

      let snip = this.findSnippet(num);
      if (snip === undefined) return;

      if (this.correctUsers.has(num)) {
        let existingUser = this.correctUsers.get(num);
        if (existingUser !== userId) {
          this.correctUsers.set(num, userId);
          return {
            type: ResponseType.MESSAGE,
            data: {
              content: `[Snippet #${num}] **Correction**: <@${userId}> posted the correct answer!`,
            },
          };
        }
        return;
      }

      this.correctUsers.set(num, userId);

      return {
        type: ResponseType.MESSAGE,
        data: {
          content: `[Snippet #${num}] <@${userId}> posted the correct answer! (+${snip.reward} Event Points)`,
        },
      };
    });

    this.cleanupFunctions = [cleanupPost, cleanupVerify];
  }

  /**
   * Stop the game
   */
  async stop() {
    if (!this.active) return;

    this.active = false;
    let ch = await this.getChannel();
    await ch.send("Screenshot game has ended!");

    let totalPoints = new Map<string, number>();
    for (let [num, userId] of this.correctUsers.entries()) {
      if (!totalPoints.has(userId)) totalPoints.set(userId, 0);
      let snip = this.findSnippet(num);
      if (snip) {
        totalPoints.set(userId, totalPoints.get(userId)! + snip.reward);
      }
    }
    this.correctUsers = new Map();

    for (let [userId, total] of totalPoints.entries()) {
      let member = await Member.withId(userId);
      await member.givePoints(total);
    }

    let usersByTotal = [...totalPoints.keys()];
    usersByTotal.sort((a, b) => totalPoints.get(b)! - totalPoints.get(a)!);

    let totalMsg = ["```r", "Total event points earned this session:"];
    for (let userId of usersByTotal) {
      let user = await ch.guild.members.fetch(userId);
      totalMsg.push(`${user.displayName}: ${totalPoints.get(userId)}`);
    }
    totalMsg.push("```");

    await ch.send(totalMsg.join("\n"));

    for (let cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.snippetSets = [];
    this.cleanupFunctions = [];

    await this.cmd.deleteCommandByName("org-post");
    await this.cmd.deleteCommandByName("org-verify");
  }

  findSnippet(number: number): Snippet | undefined {
    for (let set of this.snippetSets) {
      let snip = set.snippets.find((s) => s.number == number);
      if (snip) return snip;
    }
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
}

/**
 * Represents a screenshot that is to be guessed
 */
export class Snippet {
  number: number;
  source: string;
  reward: number;

  constructor(number: number, source: string, reward: number) {
    this.number = number;
    this.source = source;
    this.reward = reward;
  }
}

/**
 * Represents a set of snippets to be posted at the same time
 */
export class SnippetSet {
  number: number;
  img: string;
  snippets: Array<Snippet>;

  constructor(number: number, img: string, snippets: Array<Snippet>) {
    this.number = number;
    this.img = img;
    this.snippets = snippets;
  }
}
