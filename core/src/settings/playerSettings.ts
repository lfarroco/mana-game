export type PlayerSettings = {
  sound: boolean;
  soundVolume: number;
  music: boolean;
  musicVolume: number;
  masterVolume: number;
  debug: boolean;
  speed: number;
  particles: "low" | "medium" | "high";
  compactTooltips: boolean;
};

export const defaultSettings = (): PlayerSettings => ({
  sound: true,
  soundVolume: 0.6,
  music: true,
  musicVolume: 0.4,
  masterVolume: 1,
  debug: false,
  speed: 4,
  particles: "medium",
  compactTooltips: false,
});
