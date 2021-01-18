import { Sequelize } from "sequelize";
import { Member } from "./models/member";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "storage.db",
});

/**
 * Initialize the database
 */
export function initializeConnection() {
  Member.initialize(sequelize);

  sequelize.sync();
}
