export type Wallet = "standard" | "demo";
export type DemoEnvironment = {
  DEMO_MODE?: string;
  DEMO_WELCOME_CREDITS?: string;
};
export const demoEnabled = (env: DemoEnvironment) => env.DEMO_MODE === "true";
export const activeWallet = (env: DemoEnvironment): Wallet =>
  demoEnabled(env) ? "demo" : "standard";
export const defaultCharacterCredits = 300;
export function initialDemoCredits(env: DemoEnvironment) {
  const value = Number(env.DEMO_WELCOME_CREDITS ?? "2000");
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000)
    throw new Error(
      "Demo credit allocation must be an integer between 0 and 10000.",
    );
  return value;
}
