import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, SummaryCardData } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not defined in the environment.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Custom error class for categorized handling in the UI
export class ServiceError extends Error {
  constructor(message: string, public type: 'API' | 'NETWORK' | 'PARSING' | 'AUDIO' = 'API') {
    super(message);
    this.name = 'ServiceError';
  }
}

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!base64String) {
        reject(new ServiceError("Failed to read the file.", "PARSING"));
        return;
      }
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new ServiceError("Error reading the file. Please try again.", "PARSING"));
    reader.readAsDataURL(file);
  });
};

export const analyzeMedicalDocument = async (
  imageFile: File
): Promise<AnalysisResult> => {
  let base64Image: string;
  try {
    base64Image = await fileToGenerativePart(imageFile);
  } catch (error) {
    throw error instanceof ServiceError ? error : new ServiceError("Failed to process the image file.", "PARSING");
  }

  // 1. Vision & Text Understanding (Gemini 3 Pro Preview)
  // We ask for a structured JSON response to easily populate the UI.
  const analysisModel = "gemini-3-pro-preview";
  
  const systemPrompt = `
    You are the engine behind **Smart Health Explainer**.
    
    1. Extract ALL visible text from the image (OCR).
    2. Simplify the medical text for low-literacy users.
    3. Create a structured summary card, including potential interactions.
    
    Do NOT diagnose. Do NOT give new medical advice. Only simplify what is present.
    If unreadable, state "This part was unclear".
  `;

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      rawText: {
        type: Type.STRING,
        description: "The raw text extracted from the image via OCR.",
      },
      simplifiedExplanation: {
        type: Type.STRING,
        description: "A very simple, warm, human-readable explanation for a non-expert.",
      },
      summaryCard: {
        type: Type.OBJECT,
        description: "Structured data for the health summary card.",
        properties: {
          medicines: { type: Type.ARRAY, items: { type: Type.STRING } },
          howToTake: { type: Type.STRING },
          warnings: { type: Type.STRING },
          interactions: { type: Type.STRING, description: "Potential drug-drug or drug-food interactions based on the medicines." },
          avoid: { type: Type.STRING },
          whenToReturn: { type: Type.STRING },
          nextSteps: { type: Type.STRING },
        },
        required: ["medicines", "howToTake", "warnings", "interactions", "avoid", "whenToReturn", "nextSteps"],
      },
    },
    required: ["rawText", "simplifiedExplanation", "summaryCard"],
  };

  try {
    const analysisResponse = await ai.models.generateContent({
      model: analysisModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: imageFile.type,
                data: base64Image,
              },
            },
            {
              text: "Analyze this medical document. Provide the raw text, a simplified explanation, and a structured summary.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const textResponse = analysisResponse.text;
    if (!textResponse) {
      throw new ServiceError("The AI model returned an empty response.", "API");
    }

    try {
      const analysisData = JSON.parse(textResponse) as {
        rawText: string;
        simplifiedExplanation: string;
        summaryCard: SummaryCardData;
      };

      return {
        ...analysisData,
        audioBase64: undefined, // Will be filled in the next step
      };
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      throw new ServiceError("We couldn't interpret the document structure. Please try a clearer photo.", "PARSING");
    }

  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    // Pass through existing ServiceErrors
    if (error instanceof ServiceError) throw error;

    // Handle common API errors
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        throw new ServiceError("Please check your internet connection.", "NETWORK");
    }
    if (error.status === 403 || error.message?.includes('API_KEY')) {
         throw new ServiceError("Authentication failed. Please check your API configuration.", "API");
    }
    if (error.status === 503) {
         throw new ServiceError("The service is temporarily overloaded. Please try again in a moment.", "API");
    }
    if (error.status === 429) {
        throw new ServiceError("Too many requests. Please wait a moment before trying again.", "API");
    }
    
    throw new ServiceError("We couldn't analyze this document. Please ensure it's a clear medical image.", "API");
  }
};

export const generateAudioExplanation = async (
  textToSpeak: string
): Promise<string> => {
  // 2. Audio Generation (Gemini 2.5 Flash TTS)
  const ttsModel = "gemini-2.5-flash-preview-tts";

  try {
    const audioResponse = await ai.models.generateContent({
      model: ttsModel,
      contents: [
        {
          role: "user",
          parts: [{ text: textToSpeak }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }, // Warm, clear voice
          },
        },
      },
    });

    const audioPart = audioResponse.candidates?.[0]?.content?.parts?.[0];
    if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
        return audioPart.inlineData.data;
    }
    
    throw new ServiceError("Audio generation failed: No audio data received.", "AUDIO");

  } catch (error: any) {
    console.error("TTS Error:", error);
    if (error instanceof ServiceError) throw error;
    
    if (error.message?.includes('fetch failed')) {
        throw new ServiceError("Network error while generating audio.", "NETWORK");
    }
    
    throw new ServiceError("We couldn't generate the audio explanation at this time.", "AUDIO");
  }
};