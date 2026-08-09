/**
 * Player / profile types.
 */

export type PlayerProfile = {
  id: string;
  username: string;
  rating: number;
  matches_played: number;
};

export type RankedPlayer = Pick<
  PlayerProfile,
  "id" | "username" | "rating" | "matches_played"
>;

export type RankedPlayersPage = {
  players: RankedPlayer[];
  page: number;
  hasNextPage: boolean;
};
