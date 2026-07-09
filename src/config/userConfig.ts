export interface UserConfig {
  localTimeoutMs: number;
  cloudTimeoutMs: number;
}

export function getUserConfig(): UserConfig {
  return {
    localTimeoutMs: Number(process.env.LOCAL_TIMEOUT) || 600000,
    cloudTimeoutMs: Number(process.env.CLOUD_TIMEOUT) || 120000,
  };
}
