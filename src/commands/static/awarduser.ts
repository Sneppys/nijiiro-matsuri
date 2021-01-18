import { Member } from "../../database/models/member";
import { isOrganizer } from "../../util/checks";
import { CommandClient, OptionType, ResponseType } from "../api";

export function initialize(cmd: CommandClient) {
  cmd.postCommand({
    name: "awarduser",
    description: "Award a user with points",
    options: [
      {
        name: "user",
        description: "User to give points to",
        type: OptionType.USER,
        required: true,
      },
      {
        name: "points",
        description: "Amount of points to give",
        type: OptionType.INTEGER,
        required: true,
      },
    ],
  });

  cmd.on("awarduser", async (event) => {
    if (!isOrganizer(event.userId)) return;

    const userId = event.options.user as string;
    const points = event.options.points as number;

    const guild = await cmd.getGuild();
    const user = await guild.members.fetch(userId);
    if (!user) return;

    const [memberModel] = await Member.findOrCreate({
      where: { userId },
    });
    await memberModel.givePoints(points);

    return {
      type: ResponseType.MESSAGE,
      data: {
        content: `Awarded ${user.displayName} with ${points} points!`,
      },
    };
  });
}
