import * as discord from "discord.js";

/**
 * Wrapper for the Discord slash commands API because discord.js does not officially support it yet
 *
 * Also because Typescript doesn't play nice with the workaround
 */
export class CommandClient {
  public client: discord.Client;
  public guildId: string;
  handlers: Map<string, Array<CommandHandler>>;

  /**
   * @param client The discord client object
   * @param guildId The guild to update commands for
   */
  constructor(client: discord.Client, guildId: string) {
    this.client = client;
    this.guildId = guildId;
    this.handlers = new Map();
    // @ts-expect-error
    client.ws.on("INTERACTION_CREATE", this._handleInteraction.bind(this));
  }

  /**
   * Get the discord.js guild object for this command client
   */
  public async getGuild(): Promise<discord.Guild> {
    return this.client.guilds.fetch(this.guildId);
  }

  /**
   * Create or update a command in the guild
   * @param commandData Command data object
   * @returns A promise with the command object that was created
   */
  public async postCommand(
    commandData: AppCommand
  ): Promise<CommandDescription> {
    console.log(`Posting command: ${JSON.stringify(commandData)}`);
    return (
      // @ts-expect-error
      this.client.api
        // @ts-expect-error
        .applications(this.client.user?.id)
        .guilds(this.guildId)
        .commands.post({ data: commandData })
    );
  }

  /**
   * Delete a command from the guild
   * @param commandId The command ID to delete
   */
  public async deleteCommand(commandId: string) {
    console.log(`Deleting command ID ${JSON.stringify(commandId)}`);
    // @ts-expect-error
    this.client.api
      // @ts-expect-error
      .applications(this.client.user?.id)
      .guilds(this.guildId)
      .commands(commandId)
      .delete();
  }

  /**
   * Delete a command from the guild with the given name
   * @param commandName The name of the command to delete
   */
  public async deleteCommandByName(commandName: string) {
    let commands = await this.getCommands();
    let command = commands.find((cmd) => cmd.name === commandName);
    if (command) {
      await this.deleteCommand(command.id);
    }
  }

  /**
   * Get all commands in the guild
   * @returns A promise with an array of command objects
   */
  public async getCommands(): Promise<Array<CommandDescription>> {
    return (
      // @ts-expect-error
      this.client.api
        // @ts-expect-error
        .applications(this.client.user?.id)
        .guilds(this.guildId)
        .commands.get()
    );
  }

  /**
   * Register a command handler for a specific command
   * * Only the first handler to return a response object has its response sent to the API
   * @param commandName The command to respond to
   * @param handler Function that runs when a user sends the command. Returns an optional {@link InteractionResponse} object.
   * @returns Function that invalidates the given handler when called.
   */
  public on(commandName: string, handler: CommandHandler): () => void {
    console.debug(`Registering command handler for '${commandName}' command.`);
    commandName = commandName.toLowerCase();
    if (!this.handlers.has(commandName)) {
      this.handlers.set(commandName, []);
    }
    this.handlers.get(commandName)?.push(handler);
    return () => {
      // remove the handler from the list
      const filtered = this.handlers
        .get(commandName)
        ?.filter((val) => val != handler);
      if (filtered) this.handlers.set(commandName, filtered);
    };
  }

  /**
   * Helper method to handle the interactions from the websocket response
   * @param interaction The interaction object from the API
   */
  async _handleInteraction(interaction: any) {
    // default response
    let response: InteractionResponse = {
      type: ResponseType.ACKNOWLEDGE,
    };
    if (interaction.type === 2) {
      // command response type

      const guildId: string = interaction.guild_id;
      if (guildId === this.guildId) {
        const commandName = interaction.data.name;
        const handlerList = this.handlers.get(commandName);
        if (handlerList !== undefined) {
          const userId: string = interaction.member.user.id;
          const channelId: string = interaction.channel_id;

          const event = new InteractionEvent(
            this.client,
            userId,
            channelId,
            this._convertOptionsData(interaction.data.options)
          );

          // fire all command handlers, only keeping response from first valid return
          let hasResponse = false;
          for (let handler of handlerList) {
            const handlerResponse = await handler(event);
            if (!hasResponse && handlerResponse) {
              response = handlerResponse;
              hasResponse = true;
            }
          }
        }
      }
    } else if (interaction.type === 1) {
      // ping response, shouldn't happen but this is a just-in-case
      response = {
        type: ResponseType.PONG,
      };
    }
    // sometimes sending a response can not play nice
    try {
      // send the response to the API
      // @ts-expect-error
      await this.client.api
        // @ts-expect-error
        .interactions(interaction.id, interaction.token)
        .callback.post({
          data: {
            type: response.type,
            data: response.data,
          },
        });
    } catch (error) {
      if (response.type !== ResponseType.ACKNOWLEDGE) {
        console.error("Error sending interaction response!", error);
        console.error("Interaction object:", interaction);
        console.error("Response object:", response);
      }
    }
  }

  /**
   * Helper function that recursively converts command options into a more usable map
   * @param options The options array passed from the API
   */
  _convertOptionsData(options: any): InteractionOptions {
    let ret: InteractionOptions = {};
    if (options) {
      for (let obj of options) {
        if (obj.options) obj.options = this._convertOptionsData(obj.options);
        ret[obj.name] = obj.options ?? obj.value;
      }
    }
    return ret;
  }
}

export type CommandDescription = {
  id: string;
  application_id: string;
  name: string;
  description: string;
};

export type AppCommand = {
  name: string;
  description: string;
  options?: Array<CommandOption>;
};

export type CommandOption = {
  type: OptionType;
  name: string;
  description: string;
  default?: boolean;
  required?: boolean;
  choices?: Array<CommandChoice>;
  options?: Array<CommandOption>;
};

export type CommandChoice = {
  name: string;
  value: string | number;
};

export enum OptionType {
  /** A subcommand that can hold non-subcommand options */
  SUB_COMMAND = 1,
  /** A group of subcommands that can ONLY hold subcommands as options */
  SUB_COMMAND_GROUP = 2,
  /** A string option */
  STRING = 3,
  /** An integer option */
  INTEGER = 4,
  /** A boolean option */
  BOOLEAN = 5,
  /** A user option. Returns a string with the user's ID. */
  USER = 6,
  /** A channel option. Returns a string with the channel's ID. */
  CHANNEL = 7,
  /** A role option. Returns a string with the role's ID. */
  ROLE = 8,
}

export type CommandHandler = (
  event: InteractionEvent
) => Promise<InteractionResponse | void> | void;

export class InteractionEvent {
  client: discord.Client;
  public userId: string;
  public channelId: string;
  public options: InteractionOptions;

  constructor(
    client: discord.Client,
    userId: string,
    channelId: string,
    options: InteractionOptions
  ) {
    this.client = client;
    this.userId = userId;
    this.channelId = channelId;
    this.options = options;
  }

  public async getUser(): Promise<discord.User> {
    return this.client.users.fetch(this.userId);
  }

  public async getChannel(): Promise<discord.Channel> {
    return this.client.channels.fetch(this.channelId);
  }
}

export interface InteractionOptions {
  [key: string]: InteractionOptions | string | number | boolean;
}

export enum ResponseType {
  /** Response to a ping. Shouldn't need to be used.*/
  PONG = 1,
  /** Acknowledge an interaction. The default response. Shouldn't need to be used. */
  ACKNOWLEDGE = 2,
  /** Respond with a message. Requires the `data` parameter to be sent. */
  MESSAGE = 3,
  /** Respond with a message and show the source command. Requires the `data` parameter to be sent. */
  MESSAGE_WITH_SOURCE = 4,
  /** Acknowledge the interaction and show the source command. */
  ACKNOWLEDGE_WITH_SOURCE = 5,
}

export type ResponseData = {
  content: string;
  embeds?: Array<object>;
};

export type InteractionResponse = {
  type: ResponseType;
  data?: ResponseData;
};
