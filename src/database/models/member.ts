import { DataTypes, Model, Sequelize, Op } from "sequelize";

/**
 * A model that represents a discord user.
 * Always contains a `userId` as the primary key.
 */
export class Member extends Model {
  public userId!: string;
  public points!: number;
  public totalEarnedPoints!: number;

  /**
   * Gets or creates a Member entry from a given User ID
   * @param userId The User ID to get an entry for
   */
  public static async withId(userId: string): Promise<Member> {
    let [member] = await Member.findOrCreate({ where: { userId } });
    return member;
  }

  /**
   * Give a member points
   * @param amount The number of points to give
   */
  public async givePoints(amount: number) {
    if (amount < 0) return;
    await this.increment("points", { by: amount });
    await this.increment("totalEarnedPoints", { by: amount });
  }

  /**
   * Lets the user spend a certain amount of points, checking to make sure they have enough
   * @param amount The number of points to subtract
   * @returns A promise that resolves to true if the user had enough points, false if they did not
   */
  public async spendPoints(amount: number): Promise<boolean> {
    await this.reload();
    if (this.points >= amount) {
      await this.increment("points", { by: -amount });
      return true;
    } else {
      return false;
    }
  }

  public async getPosition(): Promise<number> {
    let count = await Member.count({
      where: {
        totalEarnedPoints: {
          [Op.gt]: this.totalEarnedPoints,
        },
      },
    });
    return count + 1;
  }

  public static initialize(sequelize: Sequelize) {
    this.init(
      {
        userId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          primaryKey: true,
        },
        points: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        totalEarnedPoints: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
      },
      {
        sequelize,
      }
    );
  }
}
