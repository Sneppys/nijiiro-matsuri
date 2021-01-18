import * as config from "../bot.config.json";

const organizers = config.organizers || [];

/**
 * Checks if a user is an event organizer, as defined by the configuration file.
 * @param userId The discord user ID to check
 */
export function isOrganizer(userId: string): boolean {
  return organizers.includes(userId);
}
