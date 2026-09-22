export type GenerationOptions = {
  width: number;
  height: number;
  outputFormat: "jpeg" | "png" | "webp";
  sound: boolean;
  cfgScale: number;
  shotType: "customize" | "intelligence";
  shots: { prompt: string; duration: number }[];
};
export const defaultGenerationOptions: GenerationOptions = {
  width: 1536,
  height: 864,
  outputFormat: "jpeg",
  sound: false,
  cfgScale: 0.5,
  shotType: "customize",
  shots: [],
};
export function optionsFor(type: string, options: GenerationOptions) {
  return type === "image"
    ? {
        width: options.width,
        height: options.height,
        outputFormat: options.outputFormat,
      }
    : {
        sound: options.sound,
        cfgScale: options.cfgScale,
        shotType: options.shotType,
        shots: options.shotType === "customize" ? options.shots : [],
      };
}
