/**
 * Server configuration from environment variables.
 */
export type ServerConfig = {
  port: number;
  host: string;
};

export function loadConfig(env: typeof process.env = process.env): ServerConfig {
  return {
    port: parseInt(env["MANA_SERVER_PORT"] ?? "8787", 10),
    host: env["MANA_SERVER_HOST"] ?? "127.0.0.1",
  };
}
