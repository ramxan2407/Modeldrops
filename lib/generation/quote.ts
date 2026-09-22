import { z } from "zod";
import { imageCredits } from "./image-schema";
import type { GenerationEnvironment } from "./models";
const quoteSchema = z.object({
  code: z.literal(200),
  data: z.object({
    model_id: z.string(),
    price: z.number().finite().nonnegative(),
    discounted_price: z.number().finite().nonnegative(),
    currency: z.literal("USD"),
  }),
});
export async function quoteImage(
  env: GenerationEnvironment,
  endpoint: string,
  input: unknown,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    "https://api.wavespeed.ai/api/v3/model/price",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${env.WAVESPEED_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model_id: endpoint, inputs: input }),
    },
  );
  if (!response.ok)
    throw Error(
      "Could not price these settings. Check required images and options, then try again. No credits were charged.",
    );
  const { data } = quoteSchema.parse(await response.json());
  if (data.model_id !== endpoint)
    throw Error("The model price could not be verified.");
  // Retail credits use the published price; account-specific provider discounts do not change customer prices.
  return {
    credits: imageCredits(data.price),
    providerMicrousd: Math.ceil(data.discounted_price * 1000000),
    providerUsd: data.price,
  };
}
