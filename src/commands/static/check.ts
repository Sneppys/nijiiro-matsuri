import { Member } from "../../database/models/member";
import { isOrganizer } from "../../util/checks";
import { CommandClient, OptionType, ResponseType } from "../api";

export function initialize(cmd: CommandClient) {
  cmd.postCommand({
    name: "check",
    description: "Check how many points you have",
  });

  cmd.on("check", async (event) => {
    const [memberModel] = await Member.findOrCreate({
      where: { userId: event.userId },
    });

    return {
      type: ResponseType.MESSAGE_WITH_SOURCE,
      data: {
        content: `You have ${memberModel.totalEarnedPoints} points!\nAvailable to spend: ${memberModel.totalEarnedPoints}`,
      },
    };
  });
}
