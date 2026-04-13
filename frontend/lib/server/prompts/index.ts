import { buildUpscGs1ExtractionPrompt } from '@/lib/server/prompts/extraction/upsc-gs1';
import { buildUpscGs1McqPrompt } from '@/lib/server/prompts/mcq/upsc-gs1';

export const promptRegistry = {
  extraction: {
    upscGs1: buildUpscGs1ExtractionPrompt,
  },
  mcq: {
    upscGs1: buildUpscGs1McqPrompt,
  },
};
