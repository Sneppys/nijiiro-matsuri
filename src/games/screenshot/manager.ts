import * as discord from "discord.js";
import { OptionType, ResponseType } from "../../commands/api";
import { Member } from "../../database/models/member";
import { isOrganizer } from "../../util/checks";
import { GameManager } from "../baseManager";
import * as gameConfig from "../games.config.json";
import * as snippetData from "./snippets.json";

const CMD_VERIFY = "org-verify";

/**
 * Manager for the "guess the screenshot" game
 */
export class ScreenshotGameManager extends GameManager {
  logName = "Screenshot Game";

  snippetSets: Array<SnippetSet> = [];
  cleanupFunctions: Array<Function> = [];
  correctUsers: Map<number, string> = new Map();

  tickRate = 7 * 60 * 1000;
  currentSet = 1;

  /**
   * Start the game
   */
  async start(session: number): Promise<boolean> {
    switch (session) {
      case 1:
        this.snippetSets = snippetData.session_1;
    }

    if (this.snippetSets.length === 0) {
      return false;
    }

    if (!(await super.start(session))) return false;

    let ch = await this.getChannel();
    await ch.send(`Starting screenshot game! (Session #${session})`);
    this.log(`Starting screenshot game session #${session}`);

    this.correctUsers = new Map();
    this.currentSet = 1;

    await this.cmd.postCommand({
      name: CMD_VERIFY,
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
    let cleanupVerify = this.cmd.on(CMD_VERIFY, async (event) => {
      if (!isOrganizer(event.userId)) return;

      let num = event.options.num as number;
      let userId = event.options.user as string;
      let user = await this.client.users.fetch(userId);

      let snip = this.findSnippet(num);
      if (snip === undefined) return;

      let callingUser = await event.getUser();
      this.log(
        `\`${callingUser.username}\` verified snippet #${snip.number} for user \`${user.username}#${user.discriminator}\``
      );

      if (this.correctUsers.has(num)) {
        let existingUser = this.correctUsers.get(num);
        if (existingUser !== userId) {
          this.correctUsers.set(num, userId);
          return {
            type: ResponseType.MESSAGE,
            data: {
              content: `[Snippet **#${num}**] **Correction**: <@${userId}> posted the correct answer for #${num}!`,
            },
          };
        }
        return;
      }

      this.correctUsers.set(num, userId);

      return {
        type: ResponseType.MESSAGE,
        data: {
          content: `[Snippet **#${num}**] <@${userId}> posted the correct answer for #${num}! (+${snip.reward} Event Points)`,
        },
      };
    });

    this.cleanupFunctions = [cleanupVerify];

    return true;
  }

  /**
   * Stop the game
   */
  async stop(): Promise<boolean> {
    if (!(await super.stop())) return false;

    let ch = await this.getChannel();
    await ch.send("Screenshot game has ended!");

    this.log(`Ending screenshot game session #${this.session}`);

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

    await this.cmd.deleteCommandByName(CMD_VERIFY);

    return true;
  }

  async tick() {
    if (await this.postSet(this.currentSet)) {
      this.log(
        `Successfully posted set ${this.currentSet}, waiting to post the next if it exists`
      );
      this.currentSet++;
    } else {
      this.stopTicking();
      this.log("All sets have been posted, game can now safely end");
    }

    super.tick();
  }

  /**
   * Post a snippet set
   * @param number The set number to post
   * @returns true if the set existed, false otherwise
   */
  async postSet(number: number): Promise<boolean> {
    let set = this.snippetSets.find((s) => s.number === number);
    if (set) {
      let embed = new discord.MessageEmbed({
        title: `Snippet Set #${set.number}`,
        image: { url: `${gameConfig.screenshot.sourceUrl}${set.img}` },
      });

      let ch = await this.getChannel();
      ch.send(embed);

      return true;
    }
    return false;
  }

  /**
   * Get a snippet by its number
   * @param number The number to search for
   * @returns The snippet, or undefined if not found
   */
  findSnippet(number: number): Snippet | undefined {
    for (let set of this.snippetSets) {
      let snip = set.snippets.find((s) => s.number == number);
      if (snip) return snip;
    }
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
