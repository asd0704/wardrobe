// interfaces.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Improved Gemini client utilities:
 * - Better typings for candidate/parts
 * - Robust parsing of responses (text, json)
 * - File/Blob -> base64 helper for browser usage
 * - Environment API key fallback
 * - Safer URL building and error handling
 */

interface GeminiConfig {
  apiKey?: string; // optional here — will fallback to env if not provided
  modelName?: string;
}

interface GeminiCandidatePart {
  text?: string;
  // some responses may include structuredJson, inlineData etc.
  structuredJson?: any;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  // any additional unknown keys allowed
  [k: string]: any;
}

interface GeminiCandidate {
  content: {
    parts: GeminiCandidatePart[];
  };
  groundingMetadata?: {
    groundingAttributions?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  // some responses include a top-level "output" or other fields
  [k: string]: any;
}

// --- Simple exponential backoff fetch with improved error messages ---
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  retries = 5,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      // Retry only on 5xx or 429
      if (response.status >= 500 || response.status === 429) {
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, delay));
          return fetchWithBackoff(url, options, retries - 1, delay * 2);
        }
        // no retries left
        throw new Error(`HTTP ${response.status}: ${await safeText(response)}`);
      }
      // Return non-retriable response to caller (so they can inspect body)
      return response;
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unable to read body>';
  }
}

// --- Gemini client class ---
class GeminiAPI {
  private apiKey: string;
  private modelName: string;
  private baseURL: string;

  constructor(config: GeminiConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) || '';
    this.modelName = config.modelName || 'gemini-pro-vision';
    // Keep baseURL version flexible — update if your environment requires different path
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    if (!this.apiKey) {
      console.warn('GeminiAPI: no API key provided. Ensure you set GEMINI_API_KEY or pass it to the constructor.');
    }
  }

  private buildURL(endpoint: string, model?: string, isStream = false): string {
    const modelToUse = model || this.modelName;
    const encodedModel = encodeURIComponent(modelToUse);
    const alt = isStream ? '&alt=sse' : '';
    const keyParam = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.baseURL}/models/${encodedModel}:${endpoint}${keyParam}${alt}`;
  }

  // Generic parse: finds first readable text or JSON in candidates
  private parseResponseText(resp: GeminiResponse): string {
    if (!resp || !Array.isArray(resp.candidates)) return '';

    // Try candidates in order
    for (const candidate of resp.candidates) {
      const parts = candidate?.content?.parts ?? [];
      // try to find structuredJson first (some endpoints return structuredJson)
      for (const p of parts) {
        if (p.structuredJson) {
          try {
            return typeof p.structuredJson === 'string' ? p.structuredJson : JSON.stringify(p.structuredJson);
          } catch {
            // ignore and continue
          }
        }
      }

      // Then try text parts and accumulate
      const textParts: string[] = [];
      for (const p of parts) {
        if (typeof p.text === 'string' && p.text.trim().length > 0) {
          textParts.push(p.text);
        } else if (p.inlineData && p.inlineData.data) {
          // if the model returns inlineData in response, note it (base64 image) - not typical for text responses
          textParts.push(`[inlineData: mime=${p.inlineData.mimeType ?? 'unknown'} length=${(p.inlineData.data as string).length}]`);
        }
      }
      if (textParts.length > 0) return textParts.join('\n').trim();
    }

    // If nothing found, fallback to stringifying whole response
    try {
      return JSON.stringify(resp);
    } catch {
      return '';
    }
  }

  async generateContent(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
    }
  ): Promise<string> {
    const url = this.buildURL('generateContent');

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1024,
        topP: options?.topP ?? 0.8,
        topK: options?.topK ?? 40
      }
    };

    const response = await fetchWithBackoff(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const body = await safeText(response);
      throw new Error(`Gemini generateContent error ${response.status}: ${body}`);
    }

    const data: GeminiResponse = await response.json();
    const out = this.parseResponseText(data);
    if (!out) throw new Error('No valid textual response from Gemini generateContent');
    return out;
  }

  async generateContentMultimodal(
    parts: GeminiCandidatePart[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
    }
  ): Promise<string> {
    const url = this.buildURL('generateContent');

    const requestBody: any = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
        topP: options?.topP ?? 0.8,
        topK: options?.topK ?? 40
      }
    };

    const response = await fetchWithBackoff(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const body = await safeText(response);
      throw new Error(`Gemini generateContent error ${response.status}: ${body}`);
    }

    const data: GeminiResponse = await response.json();
    const out = this.parseResponseText(data);
    if (!out) throw new Error('No valid textual response from Gemini generateContent');
    return out;
  }

  /**
   * analyzeImage:
   * - imageBase64: base64 string WITHOUT the "data:<mime>;base64," prefix (just raw base64).
   * - mimeType: e.g. "image/jpeg" or "image/png"
   * - prompt: text prompt to guide model
   * - jsonSchema: optional schema hint; when provided, we set responseMimeType and responseSchema
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    jsonSchema: Record<string, any> | null = null
  ): Promise<string> {
    const url = this.buildURL('generateContent', this.modelName);

    const generationConfig: any = {
      temperature: 0.3,
      maxOutputTokens: 500,
      topP: 0.8,
      topK: 40
    };

    if (jsonSchema) {
      // Many servers accept a responseMimeType or responseSchema
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = jsonSchema;
    }

    // According to your previous code, image is placed as inlineData after the prompt.
    // Keep that format and be defensive about the API's expected shapes.
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    const response = await fetchWithBackoff(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const body = await safeText(response);
      throw new Error(`Gemini analyzeImage error ${response.status}: ${body}`);
    }

    const data: GeminiResponse = await response.json();
    const text = this.parseResponseText(data);
    if (!text) throw new Error('No textual response from Gemini analyzeImage');
    return text;
  }

  async streamContent(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream | null> {
    const url = this.buildURL('streamGenerateContent', this.modelName, true);

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1024,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await fetchWithBackoff(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const body = await safeText(response);
      throw new Error(`Gemini stream error ${response.status}: ${body}`);
    }

    return response.body ?? null;
  }
}

// --- Singleton instance management ---
let geminiInstance: GeminiAPI | null = null;

export function createGeminiAPI(config?: GeminiConfig): GeminiAPI {
  if (!geminiInstance) {
    geminiInstance = new GeminiAPI(config || {});
  }
  return geminiInstance;
}

export function getGeminiAPI(): GeminiAPI {
  if (!geminiInstance) {
    geminiInstance = new GeminiAPI({});
  }
  return geminiInstance;
}

// --- Utilities for browser: File/Blob -> base64 ---
/**
 * Reads a File or Blob into a base64 string (without the "data:*;base64," prefix).
 * Returns { base64, mimeType }.
 */
export async function fileToBase64(file: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reader.abort();
      reject(new Error('Failed to read file'));
    };
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like: data:<mimeType>;base64,<data>
      const match = result.match(/^data:(.*);base64,(.*)$/);
      if (!match) {
        reject(new Error('Unexpected file reader result'));
        return;
      }
      resolve({ mimeType: match[1], base64: match[2] });
    };
    reader.readAsDataURL(file);
  });
}

// --- Wardrobe utilities (improved parsing & defaults) ---
/**
 * Extracts dominant colors from a clothing image using structured JSON output.
 */
export async function extractColorsFromImage(imageBase64: string, mimeType: string): Promise<string[]> {
  const gemini = getGeminiAPI();
  const prompt = `Analyze this clothing image and extract the main colors present.
Focus on the dominant colors of the clothing item itself, not the background.
Use common color names. Return ONLY a JSON array of color name strings.`;

  // Use a simple JSON array schema hint (provider-dependent)
  const schema = {
    type: 'ARRAY',
    items: {
      type: 'STRING'
    }
  };

  try {
    const responseText = await gemini.analyzeImage(imageBase64, mimeType, prompt, schema);

    // Try parse as JSON first
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) return parsed.map((c) => String(c));
    } catch {
      // fallback: extract color names via regex / line-splitting
      const cleaned = responseText.replace(/[\[\]"']/g, '').trim();
      const possible = cleaned.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (possible.length > 0) return possible;
    }

    return ['Unknown'];
  } catch (err) {
    console.error('extractColorsFromImage error:', err);
    return ['Unknown'];
  }
}

/**
 * Identify clothing type from a list of allowed values.
 */
export async function identifyClothingType(imageBase64: string, mimeType: string): Promise<string> {
  const gemini = getGeminiAPI();
  const validTypes = ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'ACCESSORY', 'UNDERWEAR', 'SWIMWEAR', 'SPORTSWEAR'];
  const prompt = `Identify the type of clothing item in this image.
Return ONLY one of these exact values: ${validTypes.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    const cleaned = resp.trim().toUpperCase().replace(/["'.]/g, '');
    if (validTypes.includes(cleaned)) return cleaned;
    // attempt to find any matching token inside text
    for (const t of validTypes) {
      if (resp.toUpperCase().includes(t)) return t;
    }
    return 'TOP';
  } catch (err) {
    console.error('identifyClothingType error:', err);
    return 'TOP';
  }
}

/**
 * Suggest occasion
 */
export async function suggestOccasion(imageBase64: string, mimeType: string): Promise<string> {
  const gemini = getGeminiAPI();
  const validOccasions = ['CASUAL', 'WORK', 'FORMAL', 'PARTY', 'SPORTS', 'BEACH', 'DATE_NIGHT', 'TRAVEL'];
  const prompt = `Based on this clothing item, suggest the most appropriate occasion.
Return ONLY one of these exact values: ${validOccasions.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    const cleaned = resp.trim().toUpperCase().replace(/["'.]/g, '');
    if (validOccasions.includes(cleaned)) return cleaned;
    for (const t of validOccasions) {
      if (resp.toUpperCase().includes(t)) return t;
    }
    return 'CASUAL';
  } catch (err) {
    console.error('suggestOccasion error:', err);
    return 'CASUAL';
  }
}

/**
 * Suggest season
 */
export async function suggestSeason(imageBase64: string, mimeType: string): Promise<string> {
  const gemini = getGeminiAPI();
  const validSeasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'];
  const prompt = `Based on this clothing item, suggest the most appropriate season.
Return ONLY one of these exact values: ${validSeasons.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    const cleaned = resp.trim().toUpperCase().replace(/["'.]/g, '');
    if (validSeasons.includes(cleaned)) return cleaned;
    for (const t of validSeasons) {
      if (resp.toUpperCase().includes(t)) return t;
    }
    return 'ALL_SEASON';
  } catch (err) {
    console.error('suggestSeason error:', err);
    return 'ALL_SEASON';
  }
}

/**
 * Generate item name
 */
export async function generateItemName(imageBase64: string, mimeType: string): Promise<string> {
  const gemini = getGeminiAPI();
  const prompt = `Look at this clothing item and generate a descriptive name for it.
Return ONLY the name, no additional text or conversation.
Make it specific but concise (e.g., "White Cotton T-Shirt", "Blue Denim Jeans", "Black Leather Jacket").`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    const line = resp.split(/\r?\n/)[0].trim();
    // remove surrounding quotes and stray punctuation
    const name = line.replace(/^["']|["']$/g, '').trim();
    return name || 'Unknown Item';
  } catch (err) {
    console.error('generateItemName error:', err);
    return 'Unknown Item';
  }
}
