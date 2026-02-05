
import { GoogleGenAI, Type } from "@google/genai";
import { DomainVariables } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const brainstormVariables = async (
  topic: string, 
  fileData?: { data: string, mimeType: string }
): Promise<Partial<DomainVariables>> => {
  const ai = getAI();
  
  const parts: any[] = [
    { text: `Brainstorm domain expert variables for the following topic/context: "${topic}". 
    Return a JSON object matching the provided schema. 
    If a document is provided, extract relevant information from it to populate the expert profile accurately.
    Specifically, analyze the core responsibilities, technical domain, and operational mission. 
    DO NOT focus on speaking style here, just the "what" and "where" of the expert.` }
  ];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          roleTitle: { type: Type.STRING },
          domainArea: { type: Type.STRING },
          primaryResponsibilities: { type: Type.STRING },
          keySystems: { type: Type.STRING },
          commonTaskTypes: { type: Type.STRING },
          stakeholderExpectations: { type: Type.STRING },
        },
        required: ["roleTitle", "domainArea"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {};
  }
};

export const extractLinguisticPatterns = async (
  sampleText: string,
  fileData?: { data: string, mimeType: string }
): Promise<string> => {
  const ai = getAI();
  const parts: any[] = [
    { text: `Analyze the provided text/document for unique linguistic markers, speaking patterns, and stylistic signatures. 
    Identify and describe the following in a concise, action-oriented summary:
    - Jargon density and typical industry shorthand
    - Sentence structure (e.g., terse/direct vs. sophisticated/nuanced)
    - Pacing, rhythm, and use of contractions
    - Presence of structural analogies or metaphors
    - Specific quirks (e.g., leading with "Correct." or using "Verify that...")
    
    The goal is to create a high-fidelity 'Speaking Patterns' instruction for an AI persona.
    Additional User Context: "${sampleText}"` }
  ];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });

  return response.text || "No distinct patterns identified.";
};

export const chatWithExpert = async (systemPrompt: string, history: { role: 'user' | 'model', text: string }[]) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemPrompt,
    }
  });

  const lastMessage = history[history.length - 1].text;
  const result = await chat.sendMessage({ message: lastMessage });
  return result.text;
};
