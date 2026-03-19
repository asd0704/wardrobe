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
    // Use gemini-1.5-flash or gemini-1.5-pro for better image recognition
    this.modelName = config.modelName || 'gemini-1.5-flash';
    // Keep baseURL version flexible — update if your environment requires different path
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    if (!this.apiKey) {
      console.warn('GeminiAPI: no API key provided. Ensure you set GEMINI_API_KEY or pass it to the constructor.');
      console.warn('AI features will not work without an API key. Get one at: https://makersuite.google.com/app/apikey');
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
      temperature: 0.1, // Lower temperature for more consistent, accurate results
      maxOutputTokens: 1024, // Increased for better responses
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
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
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
  const prompt = `Analyze this clothing item image carefully. 

Focus ONLY on the clothing item itself, ignoring any background, mannequin, or other objects.

Identify the main colors present in the clothing item. Use common, simple color names like: Red, Blue, Green, Yellow, Black, White, Gray, Brown, Pink, Purple, Orange, Navy, Beige, etc.

Return the colors as a JSON array. Include 1-4 main colors in order of prominence.
Example format: ["Blue", "White"]
Return ONLY the JSON array, no other text.`;

  try {
  const responseText = await gemini.analyzeImage(imageBase64, mimeType, prompt);

    // Try parse as JSON first
    try {
      // Try to find JSON array in response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c) => String(c).trim()).filter(Boolean);
        }
      }

      // Try parsing entire response
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c) => String(c).trim()).filter(Boolean);
      }
    } catch {
      // fallback: extract color names via regex / line-splitting
      const cleaned = responseText.replace(/[\[\]"']/g, '').trim();
      const possible = cleaned.split(/[\r\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(s => s.length < 20); // Filter out long strings that aren't colors
      
      if (possible.length > 0) {
        // Take first 4 colors
        return possible.slice(0, 4);
      }
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
  const prompt = `You are a professional fashion classifier. Analyze this clothing item image and classify it into ONE of these categories.

CRITICAL: You must return EXACTLY one word from this list: TOP, BOTTOM, DRESS, OUTERWEAR, SHOES, ACCESSORY, UNDERWEAR, SWIMWEAR, SPORTSWEAR

DETAILED CLASSIFICATION GUIDE:

TOP - Upper body garments:
- T-shirts, shirts, blouses, tank tops, camisoles
- Sweaters, pullovers, cardigans, hoodies, sweatshirts
- Polo shirts, button-down shirts, dress shirts
- Crop tops, tube tops, halter tops
- Any garment primarily worn on the upper body

BOTTOM - Lower body garments:
- Pants, jeans, trousers, slacks
- Shorts, capris, bermudas
- Skirts (mini, midi, maxi, pencil, A-line)
- Leggings, tights, yoga pants
- Any garment primarily worn on the lower body

DRESS - One-piece garments:
- Dresses (casual, formal, cocktail, maxi, mini, midi)
- Gowns, evening dresses
- Jumpsuits, rompers, playsuits
- Any single-piece garment covering both upper and lower body

OUTERWEAR - Outer layers:
- Jackets (denim, leather, bomber, blazer, track)
- Coats (trench, winter, rain, peacoat)
- Blazers, suit jackets
- Cardigans worn as outer layer
- Vests, waistcoats
- Windbreakers, parkas, anoraks

SHOES - Footwear:
- Sneakers, athletic shoes, running shoes
- Boots (ankle, knee-high, combat, work)
- Sandals, flip-flops, slides
- Heels, pumps, stilettos
- Flats, loafers, oxfords
- Any item worn on feet

ACCESSORY - Non-garment items:
- Bags, purses, backpacks, totes
- Hats, caps, beanies
- Belts, suspenders
- Jewelry (necklaces, bracelets, rings, earrings)
- Watches, sunglasses
- Scarves, gloves (if not outerwear)

UNDERWEAR - Under garments:
- Underwear, briefs, boxers
- Bras, bralettes, sports bras
- Undershirts, camisoles (if worn as underwear)
- Shapewear, lingerie

SWIMWEAR - Swimming attire:
- Swimsuits, one-piece swimsuits
- Bikinis, two-piece swimsuits
- Swim trunks, board shorts
- Rash guards, wetsuits (swimming context)

SPORTSWEAR - Athletic clothing:
- Athletic jerseys, sports uniforms
- Gym wear, workout clothes
- Track suits, athletic pants
- Sports-specific uniforms (basketball, football, etc.)

ANALYSIS INSTRUCTIONS:
1. Look at the image carefully
2. Identify the PRIMARY function and location of the garment
3. Choose the MOST SPECIFIC category that fits
4. Return ONLY the exact word (e.g., "TOP" or "BOTTOM")
5. Do NOT include any explanation, punctuation, or other text
6. If unsure between categories, choose the most common one (TOP for upper body, BOTTOM for lower body)

Return your answer as a single word.`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    
    // Clean and extract the type
    let cleaned = resp.trim().toUpperCase();
    
    // Remove quotes and punctuation
    cleaned = cleaned.replace(/["'.,;:!?]/g, '');
    
    // Get first word
    const firstWord = cleaned.split(/\s+/)[0];
    
    // Check if it's a valid type
    if (validTypes.includes(firstWord)) {
      return firstWord;
    }
    
    // Try to find any valid type in the response
    for (const t of validTypes) {
      if (cleaned.includes(t)) {
        return t;
      }
    }
    
    // Check for common variations
    const typeMap: Record<string, string> = {
      'SHIRT': 'TOP',
      'T-SHIRT': 'TOP',
      'TSHIRT': 'TOP',
      'BLOUSE': 'TOP',
      'SWEATER': 'TOP',
      'HOODIE': 'TOP',
      'PANT': 'BOTTOM',
      'JEAN': 'BOTTOM',
      'TROUSER': 'BOTTOM',
      'SHORT': 'BOTTOM',
      'SKIRT': 'BOTTOM',
      'JACKET': 'OUTERWEAR',
      'COAT': 'OUTERWEAR',
      'BLAZER': 'OUTERWEAR',
      'SNEAKER': 'SHOES',
      'BOOT': 'SHOES',
      'SANDAL': 'SHOES',
      'HEEL': 'SHOES',
      'BAG': 'ACCESSORY',
      'HAT': 'ACCESSORY',
      'BELT': 'ACCESSORY',
      'SWIMSUIT': 'SWIMWEAR',
      'BIKINI': 'SWIMWEAR',
      'ATHLETIC': 'SPORTSWEAR',
      'SPORT': 'SPORTSWEAR',
      'GYM': 'SPORTSWEAR'
    };
    
    for (const [key, value] of Object.entries(typeMap)) {
      if (cleaned.includes(key)) {
        return value;
      }
    }
    
    // Default fallback
    console.warn(`Could not identify clothing type from response: "${resp}". Defaulting to TOP.`);
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
  const prompt = `Look carefully at this clothing item image.

Describe what you see in a clear, concise name format.

Include:
1. The main color(s) - e.g., "Blue", "White and Red", "Black"
2. The material or style if visible - e.g., "Cotton", "Denim", "Leather", "Silk"
3. The item type - e.g., "T-Shirt", "Jeans", "Jacket", "Dress"

Format: [Color] [Material/Style] [Item Type]
Examples: 
- "Blue Denim Jeans"
- "White Cotton T-Shirt"
- "Black Leather Jacket"
- "Red Floral Summer Dress"

Return ONLY the name, no quotes, no additional text, no explanation. Just the descriptive name.`;

  try {
    const resp = await gemini.analyzeImage(imageBase64, mimeType, prompt);
    // Get first line and clean it up
    const lines = resp.split(/\r?\n/).filter(line => line.trim().length > 0);
    let name = lines[0] || resp;
    
    // Remove quotes and clean up
    name = name.replace(/^["']|["']$/g, '').trim();
    
    // Remove common prefixes like "This is a" or "The item is"
    name = name.replace(/^(this is a|the item is|it is|it's|this is)\s+/i, '').trim();
    
    // Capitalize first letter
    if (name.length > 0) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    return name || 'Clothing Item';
  } catch (err) {
    console.error('generateItemName error:', err);
    return 'Clothing Item';
  }
}
