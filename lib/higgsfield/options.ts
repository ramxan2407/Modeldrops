export type HiggsfieldOptions = {
  enhancePrompt: boolean;
  styleId: string;
  sound: boolean;
  cfgScale: number;
  multiShots: boolean;
  shots: { prompt: string; duration: number }[];
  elements: string[];
};
export const defaultHiggsfieldOptions: HiggsfieldOptions = {
  enhancePrompt: true,
  styleId: "",
  sound: false,
  cfgScale: 0.5,
  multiShots: false,
  shots: [],
  elements: [],
};
export function optionsFor(type: string, options: HiggsfieldOptions) {
  return type === "image"
    ? { enhancePrompt: options.enhancePrompt, styleId: options.styleId }
    : {
        sound: options.sound,
        cfgScale: options.cfgScale,
        multiShots: options.multiShots,
        shots: options.multiShots ? options.shots : [],
        elements: options.elements.map((value) => value.trim()).filter(Boolean),
      };
}
