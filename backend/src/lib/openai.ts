// OpenAI API client for image analysis and outfit suggestions
/* eslint-disable @typescript-eslint/no-explicit-any */

interface OpenAIConfig {
  apiKey?: string;
  modelName?: string;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

// Simple retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, delay));
          return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
      }
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}

class OpenAIClient {
  private apiKey: string;
  private modelName: string;
  private baseURL: string;

  constructor(config: OpenAIConfig = {}) {
    // Try to get API key from config first, then environment
    this.apiKey = config.apiKey || (typeof process !== 'undefined' && (process.env as any)?.OPENAI_API_KEY) || '';
    this.apiKey = this.apiKey.trim(); // Remove any whitespace
    
    // Use gpt-4o for image analysis (best vision model)
    this.modelName = config.modelName || 'gpt-4o';
    this.baseURL = 'https://api.openai.com/v1';
    
    if (!this.apiKey || this.apiKey.length === 0) {
      console.warn('⚠️ OpenAI API key not provided. Set OPENAI_API_KEY environment variable.');
      console.warn('   AI features will not work without a valid API key.');
    } else {
      console.log('✅ OpenAI API key loaded (length:', this.apiKey.length, ')');
    }
  }

  /**
   * Analyze an image with a text prompt
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const url = `${this.baseURL}/chat/completions`;

    // Convert base64 to data URL format for OpenAI
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const requestBody = {
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      // Handle specific error codes
      if (response.status === 429) {
        throw new Error(`OpenAI API quota exceeded. Please check your billing or upgrade your plan. Original error: ${errorMessage}`);
      } else if (response.status === 401) {
        throw new Error(`OpenAI API key invalid. Please check your API key. Original error: ${errorMessage}`);
      } else if (response.status === 402) {
        throw new Error(`OpenAI API payment required. Please add payment method. Original error: ${errorMessage}`);
      }
      
      throw new Error(`OpenAI API error ${response.status}: ${errorMessage}`);
    }

    const data: OpenAIResponse = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content;
  }

  /**
   * Generate content with multiple images (for outfit suggestions)
   */
  async generateContentMultimodal(
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const url = `${this.baseURL}/chat/completions`;

    // Convert parts to OpenAI format
    const content: any[] = [];
    
    for (const part of parts) {
      if (part.text) {
        content.push({
          type: 'text',
          text: part.text
        });
      } else if (part.inlineData) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        content.push({
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        });
      }
    }

    const requestBody = {
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: OpenAIResponse = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const responseContent = data.choices?.[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content in OpenAI response');
    }

    return responseContent;
  }

  /**
   * Generate text-only responses from OpenAI (chat completion)
   */
  async generateText(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const url = `${this.baseURL}/chat/completions`;
    const requestBody = {
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options?.maxTokens || 1500,
      temperature: options?.temperature ?? 0.7
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: OpenAIResponse = await response.json();
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content;
  }
}

// Singleton instance - but allow recreation if config is provided
let openaiInstance: OpenAIClient | null = null;

export function createOpenAIClient(config?: OpenAIConfig): OpenAIClient {
  // If config is provided, create a new instance (allows overriding API key)
  if (config && (config.apiKey || config.modelName)) {
    return new OpenAIClient(config);
  }
  // Otherwise use singleton
  if (!openaiInstance) {
    openaiInstance = new OpenAIClient(config || {});
  }
  return openaiInstance;
}

export function getOpenAIClient(): OpenAIClient {
  if (!openaiInstance) {
    openaiInstance = new OpenAIClient({});
  }
  return openaiInstance;
}

// Wardrobe-specific functions using OpenAI
export async function extractColorsFromImage(imageBase64: string, mimeType: string): Promise<string[]> {
  const openai = getOpenAIClient();
  const prompt = `You are analyzing a clothing item image. Look at the image carefully and identify the main colors.

INSTRUCTIONS:
1. Focus ONLY on the clothing item itself - ignore background, mannequins, or other objects
2. Identify 1-4 main colors in order of prominence
3. Use simple, common color names: Red, Blue, Green, Yellow, Black, White, Gray, Brown, Pink, Purple, Orange, Navy, Beige, Teal, Maroon, etc.
4. If the item has patterns, identify the dominant background colors

CRITICAL: You MUST return ONLY a valid JSON array. No explanations, no markdown, no code blocks.
Example: ["Blue", "White"]
Bad examples: "The colors are blue and white" or \`\`\`json ["Blue"]\`\`\`

Return ONLY: ["Color1", "Color2"]`;

  try {
    const responseText = await openai.analyzeImage(imageBase64, mimeType, prompt);
    console.log('🎨 Raw color extraction response:', responseText.substring(0, 200));

    // Try to parse JSON
    try {
  const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const colors = parsed.map((c) => String(c).trim()).filter(Boolean);
          console.log('✅ Parsed colors from JSON:', colors);
          return colors;
        }
      }
      
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const colors = parsed.map((c) => String(c).trim()).filter(Boolean);
        console.log('✅ Parsed colors from full response:', colors);
        return colors;
      }
    } catch (parseErr) {
      console.log('⚠️ JSON parse failed, trying text extraction...');
      // Fallback: extract color names
      const cleaned = responseText.replace(/[\[\]"']/g, '').trim();
      const possible = cleaned.split(/[\r\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(s => s.length < 20 && s.length > 2);
      
      if (possible.length > 0) {
        console.log('✅ Extracted colors from text:', possible.slice(0, 4));
        return possible.slice(0, 4);
      }
    }

    console.warn('⚠️ Could not extract colors, returning Unknown');
    return ['Unknown'];
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error';
    console.error('❌ extractColorsFromImage error:', errorMsg);
    
    // If it's a quota/billing error, log it clearly
    if (errorMsg.includes('quota') || errorMsg.includes('billing') || errorMsg.includes('429')) {
      console.error('💳 OpenAI API quota exceeded. Please check your OpenAI account billing or upgrade your plan.');
      console.error('   Items will be saved with default values until the quota is restored.');
    }
    
    return ['Unknown'];
  }
}

export async function identifyClothingType(imageBase64: string, mimeType: string): Promise<string> {
  const openai = getOpenAIClient();
  const validTypes = ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'ACCESSORY', 'UNDERWEAR', 'SWIMWEAR', 'SPORTSWEAR'];
  
  const prompt = `You are a professional fashion classifier. Analyze this clothing item image and classify it into ONE category.

VALID CATEGORIES (return EXACTLY one word):
TOP, BOTTOM, DRESS, OUTERWEAR, SHOES, ACCESSORY, UNDERWEAR, SWIMWEAR, SPORTSWEAR

CLASSIFICATION RULES:

TOP = Upper body garments:
- Shirts, T-shirts, blouses, sweaters, hoodies, tank tops, polo shirts
- Any garment worn on the upper body/torso

BOTTOM = Lower body garments:
- Pants, jeans, trousers, shorts, skirts, leggings
- Any garment worn on the lower body/legs

DRESS = One-piece garments:
- Dresses, gowns, jumpsuits, rompers
- Single-piece covering both upper and lower body

OUTERWEAR = Outer layers:
- Jackets, coats, blazers, cardigans, vests
- Items worn over other clothing

SHOES = Footwear:
- All shoes, boots, sandals, heels, flats

ACCESSORY = Non-garment items (CRITICAL - includes ALL jewelry):
- Jewelry: Necklaces, earrings, bracelets, rings, pendants, chains, jewelry of any kind
- Bags, purses, backpacks, hats, belts, scarves, watches, sunglasses
- If it's jewelry, it MUST be ACCESSORY, never TOP

UNDERWEAR = Under garments:
- Underwear, bras, undershirts

SWIMWEAR = Swimming attire:
- Swimsuits, bikinis, swim trunks

SPORTSWEAR = Athletic clothing:
- Athletic jerseys, gym wear, workout clothes

CRITICAL INSTRUCTIONS:
1. Look at the image carefully
2. Identify what the item actually is
3. If it's jewelry (necklace, earring, bracelet, ring), return ACCESSORY
4. Return ONLY the exact word from the list above
5. No explanations, no punctuation, no other text
6. Just the word: TOP, BOTTOM, DRESS, OUTERWEAR, SHOES, ACCESSORY, UNDERWEAR, SWIMWEAR, or SPORTSWEAR

Your response:`;

  try {
    const resp = await openai.analyzeImage(imageBase64, mimeType, prompt);
    console.log('👕 Raw clothing type response:', resp.substring(0, 100));
    
    let cleaned = resp.trim().toUpperCase();
    cleaned = cleaned.replace(/["'.,;:!?]/g, '');
    const firstWord = cleaned.split(/\s+/)[0];
    
    console.log('🔍 Cleaned response:', cleaned);
    console.log('🔍 First word:', firstWord);
    
    if (validTypes.includes(firstWord)) {
      console.log('✅ Matched valid type:', firstWord);
      return firstWord;
    }
    
    for (const t of validTypes) {
      if (cleaned.includes(t)) {
        console.log('✅ Found type in response:', t);
        return t;
      }
    }
    
    // Type mapping for variations
    const typeMap: Record<string, string> = {
      'SHIRT': 'TOP', 'T-SHIRT': 'TOP', 'TSHIRT': 'TOP', 'BLOUSE': 'TOP', 'SWEATER': 'TOP', 'HOODIE': 'TOP',
      'PANT': 'BOTTOM', 'JEAN': 'BOTTOM', 'TROUSER': 'BOTTOM', 'SHORT': 'BOTTOM', 'SKIRT': 'BOTTOM',
      'JACKET': 'OUTERWEAR', 'COAT': 'OUTERWEAR', 'BLAZER': 'OUTERWEAR',
      'SNEAKER': 'SHOES', 'BOOT': 'SHOES', 'SANDAL': 'SHOES', 'HEEL': 'SHOES',
      'BAG': 'ACCESSORY', 'HAT': 'ACCESSORY', 'BELT': 'ACCESSORY', 'JEWELRY': 'ACCESSORY', 'NECKLACE': 'ACCESSORY', 'EARRING': 'ACCESSORY', 'BRACELET': 'ACCESSORY', 'RING': 'ACCESSORY',
      'SWIMSUIT': 'SWIMWEAR', 'BIKINI': 'SWIMWEAR',
      'ATHLETIC': 'SPORTSWEAR', 'SPORT': 'SPORTSWEAR', 'GYM': 'SPORTSWEAR'
    };
    
    for (const [key, value] of Object.entries(typeMap)) {
      if (cleaned.includes(key)) {
        console.log(`✅ Mapped "${key}" to type:`, value);
        return value;
      }
    }
    
    console.warn(`⚠️ Could not identify clothing type from response: "${resp}". Defaulting to TOP.`);
    return 'TOP';
  } catch (err) {
    console.error('❌ identifyClothingType error:', err);
    return 'TOP';
  }
}

export async function suggestOccasion(imageBase64: string, mimeType: string): Promise<string> {
  const openai = getOpenAIClient();
  const validOccasions = ['CASUAL', 'WORK', 'FORMAL', 'PARTY', 'SPORTS', 'BEACH', 'DATE_NIGHT', 'TRAVEL'];
  const prompt = `Based on this clothing item, suggest the most appropriate occasion.
Return ONLY one of these exact values: ${validOccasions.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await openai.analyzeImage(imageBase64, mimeType, prompt);
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

export async function suggestSeason(imageBase64: string, mimeType: string): Promise<string> {
  const openai = getOpenAIClient();
  const validSeasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'];
  const prompt = `Based on this clothing item, suggest the most appropriate season.
Return ONLY one of these exact values: ${validSeasons.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await openai.analyzeImage(imageBase64, mimeType, prompt);
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

export async function generateItemName(imageBase64: string, mimeType: string): Promise<string> {
  const openai = getOpenAIClient();
  const prompt = `Analyze this clothing item image and create a descriptive name.

INSTRUCTIONS:
1. Look at the image carefully
2. Identify the main color(s) - use simple names: Blue, Red, Black, White, etc.
3. Identify the material or style if visible: Cotton, Denim, Leather, Silk, Floral, Striped, etc.
4. Identify the item type: T-Shirt, Jeans, Jacket, Dress, Necklace, etc.

FORMAT: [Color] [Material/Style] [Item Type]

EXAMPLES:
- "Blue Denim Jeans"
- "White Cotton T-Shirt"
- "Black Leather Jacket"
- "Red Floral Summer Dress"
- "Silver Chain Necklace"
- "Brown Leather Boots"

CRITICAL: Return ONLY the name. No quotes, no explanations, no "This is a" or "The item is". Just the name.

Your response:`;

  try {
    const resp = await openai.analyzeImage(imageBase64, mimeType, prompt);
    console.log('📝 Raw item name response:', resp.substring(0, 150));
    
    const lines = resp.split(/\r?\n/).filter(line => line.trim().length > 0);
    let name = lines[0] || resp;
    name = name.replace(/^["']|["']$/g, '').trim();
    name = name.replace(/^(this is a|the item is|it is|it's|this is|name:|item:)\s+/i, '').trim();
    name = name.replace(/```[\w]*\n?/g, '').trim();
    if (name.length > 0) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    const finalName = name || 'Clothing Item';
    console.log('✅ Generated item name:', finalName);
    return finalName;
  } catch (err) {
    console.error('❌ generateItemName error:', err);
    return 'Clothing Item';
  }
}

