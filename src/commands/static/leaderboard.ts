import { Member } from "../../database/models/member";
import { CommandClient, OptionType, ResponseType } from "../api";

export function initialize(cmd: CommandClient) {
  cmd.postCommand({
    name: "leaderboard",
    description: "View the current event leaderboard",
    options: [],
  });

  cmd.on("leaderboard", async (event) => {
    let find = await Member.findAndCountAll({
      limit: 10,
      order: [["totalEarnedPoints", "DESC"]],
    });

    let guild = await cmd.getGuild();

    let msg = ["Current leaderboard:", "```r"];
    let indx = 1;
    for (let member of find.rows) {
      let user = await guild.members.fetch(member.userId);
      msg.push(
        `${indx}. ${user.displayName}: ${member.totalEarnedPoints} event points`
      );
      indx++;
    }
    msg.push("```");

    let curMember = await Member.withId(event.userId);
    let place = await curMember.getPosition();

    msg.push(`Your position: ${place}`);

    return {
      type: ResponseType.MESSAGE_WITH_SOURCE,
      data: {
        content: msg.join("\n"),
      },
    };
  });
}
