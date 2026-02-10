
import { GoogleGenAI } from "@google/genai";
import { GenerationParams, ModelType } from "../types";

export const generateImage = async (params: GenerationParams): Promise<string> => {
  const { prompt, baseImage, aspectRatio, imageSize, model } = params;

  // Initialize client. Always use a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contents: any = {
    parts: []
  };

  if (baseImage) {
    // If base image exists, it's an editing task
    const [mimePart, dataPart] = baseImage.split(';base64,');
    const mimeType = mimePart.split(':')[1];
    contents.parts.push({
      inlineData: {
        data: dataPart,
        mimeType: mimeType,
      },
    });
    contents.parts.push({ text: prompt });
  } else {
    // Standard generation
    contents.parts.push({ text: prompt });
  }

  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio,
    }
  };

  // gemini-3-pro-image-preview specific settings
  if (model === 'gemini-3-pro-image-preview') {
    config.imageConfig.imageSize = imageSize || '1K';
    // Fix: Use 'google_search' instead of 'googleSearch' for nano banana (image generation) series models
    config.tools = [{ google_search: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config,
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image was generated. Please try a different prompt.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Response did not contain image data.");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_ERROR");
    }
    throw error;
  }
};