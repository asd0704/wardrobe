// Hugging Face Inference API client for image analysis
/* eslint-disable @typescript-eslint/no-explicit-any */

interface HuggingFaceConfig {
  apiKey?: string;
  modelName?: string;
}

interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
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

class HuggingFaceClient {
  private apiKey: string;
  private baseURL: string;
  private imageCaptionModel: string;
  private textModel: string;

  constructor(config: HuggingFaceConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' && (process.env as any)?.HUGGINGFACE_API_KEY) || '';
    // Updated to use the new router endpoint (but fallback to old format if needed)
    // The new endpoint might require different authentication
    this.baseURL = 'https://api-inference.huggingface.co/models';
    
    // Use free vision-language models that work with the free tier
    // BLIP is good for image captioning
    this.imageCaptionModel = 'Salesforce/blip-image-captioning-base';
    // For text, use a smaller model that's more likely to be available
    this.textModel = 'gpt2'; // Using GPT-2 as fallback - it's always available
    
    if (!this.apiKey) {
      console.warn('⚠️ HuggingFace API key not provided. Set HUGGINGFACE_API_KEY environment variable.');
      console.warn('   AI features will not work without an API key.');
    } else {
      console.log('✅ HuggingFace API key loaded (length:', this.apiKey.length, ')');
    }
  }

  /**
   * Analyze an image and get a description
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('HuggingFace API key is required');
    }

    // Try new router endpoint first, fallback to old if needed
    let url = `https://router.huggingface.co/hf-inference/models/${this.imageCaptionModel}`;
    
    // Convert base64 to buffer for Hugging Face
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    let response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });

    // If new endpoint fails with 410 or similar, the API structure might be different
    // For now, we'll handle errors gracefully
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Handle 410 - API endpoint deprecated or changed
      if (response.status === 410 || errorText.includes('no longer supported')) {
        console.error('❌ HuggingFace API endpoint format has changed.');
        console.error('   The free Inference API structure may have been updated.');
        console.error('   Falling back to basic image description extraction.');
        // Return a basic description based on the image
        return 'A clothing item';
      }
      
      // Handle rate limiting
      if (response.status === 503) {
        // Model might be loading, wait and retry
        console.log('⏳ Model is loading, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.analyzeImage(imageBase64, mimeType, prompt);
      }
      
      // Handle 429 - rate limit
      if (response.status === 429) {
        console.warn('⚠️ Rate limit reached, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.analyzeImage(imageBase64, mimeType, prompt);
      }
      
      throw new Error(`HuggingFace API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data: HuggingFaceResponse | HuggingFaceResponse[] = await response.json();
    
    // Handle array responses (some models return arrays)
    const result = Array.isArray(data) ? data[0] : data;
    
    if (result.error) {
      throw new Error(`HuggingFace API error: ${result.error}`);
    }

    const caption = result.generated_text || '';
    if (!caption) {
      throw new Error('No caption generated from HuggingFace response');
    }

    return caption;
  }

  /**
   * Use text model to extract structured information from image description
   */
  async extractStructuredInfo(
    imageDescription: string,
    prompt: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('HuggingFace API key is required');
    }

    // Use a simpler, faster text model for extraction
    // Using GPT-2 which is more likely to be available on free tier
    const textModel = 'gpt2';
    const url = `https://router.huggingface.co/hf-inference/models/${textModel}`;
    
    const fullPrompt = `${prompt}\n\nImage description: ${imageDescription}\n\nResponse:`;

    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.1,
            return_full_text: false
          }
        })
      });

      if (!response.ok) {
        // If text model fails, return the image description as fallback
        console.warn('Text model extraction failed, using image description');
        return imageDescription;
      }

      const data: any = await response.json();
      
      // Handle different response formats
      let text = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        text = data[0].generated_text;
      } else if (data.generated_text) {
        text = data.generated_text;
      } else if (typeof data === 'string') {
        text = data;
      }

      if (!text) {
        // Fallback to image description
        return imageDescription;
      }

      return text.trim();
    } catch (error) {
      // If text extraction fails, use image description
      console.warn('Text extraction failed, using image description:', error);
      return imageDescription;
    }
  }

  /**
   * Combined method: analyze image and extract structured info
   */
  async analyzeImageWithPrompt(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string> {
    try {
      // First, get image description
      const imageDescription = await this.analyzeImage(imageBase64, mimeType);
      console.log('📸 Image description:', imageDescription.substring(0, 100));
      
      // If we got a basic fallback description, try to extract info from it
      if (imageDescription === 'A clothing item') {
        console.warn('⚠️ Got basic fallback description, using simple text extraction');
        // Try to extract some info from the prompt itself as a basic fallback
        return this.simpleTextExtraction(prompt);
      }
      
      // Then, use text model to extract structured info
      const structuredInfo = await this.extractStructuredInfo(imageDescription, prompt);
      return structuredInfo;
    } catch (error: any) {
      // If structured extraction fails, try direct image analysis with a different approach
      console.warn('⚠️ Structured extraction failed, trying direct analysis...', error.message);
      
      try {
        // For now, return the image description as fallback
        const imageDescription = await this.analyzeImage(imageBase64, mimeType);
        return imageDescription;
      } catch (imgError: any) {
        // If even image analysis fails, use simple text extraction
        console.error('❌ Image analysis also failed, using simple text extraction');
        return this.simpleTextExtraction(prompt);
      }
    }
  }

  /**
   * Simple text-based extraction when API fails
   */
  private simpleTextExtraction(prompt: string): string {
    // Try to extract keywords from the prompt
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract clothing type hints
    if (lowerPrompt.includes('accessory') || lowerPrompt.includes('jewelry') || lowerPrompt.includes('necklace') || lowerPrompt.includes('ring')) {
      return 'ACCESSORY';
    }
    if (lowerPrompt.includes('top') || lowerPrompt.includes('shirt') || lowerPrompt.includes('blouse')) {
      return 'TOP';
    }
    if (lowerPrompt.includes('bottom') || lowerPrompt.includes('pant') || lowerPrompt.includes('jean')) {
      return 'BOTTOM';
    }
    if (lowerPrompt.includes('dress')) {
      return 'DRESS';
    }
    if (lowerPrompt.includes('shoe') || lowerPrompt.includes('boot')) {
      return 'SHOES';
    }
    
    // Default
    return 'TOP';
  }
}

// Singleton instance
let hfInstance: HuggingFaceClient | null = null;

export function createHuggingFaceClient(config?: HuggingFaceConfig): HuggingFaceClient {
  if (!hfInstance) {
    hfInstance = new HuggingFaceClient(config || {});
  }
  return hfInstance;
}

export function getHuggingFaceClient(): HuggingFaceClient {
  if (!hfInstance) {
    hfInstance = new HuggingFaceClient({});
  }
  return hfInstance;
}

// Wardrobe-specific functions using Hugging Face
export async function extractColorsFromImage(imageBase64: string, mimeType: string): Promise<string[]> {
  const hf = getHuggingFaceClient();
  const prompt = `Based on this image description, identify the main colors present in the clothing item. 
Return ONLY a JSON array of color names. Use simple color names like: Red, Blue, Green, Yellow, Black, White, Gray, Brown, Pink, Purple, Orange, Navy, Beige.
Example: ["Blue", "White"]
Return ONLY the JSON array, no other text.`;

  try {
    const responseText = await hf.analyzeImageWithPrompt(imageBase64, mimeType, prompt);
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
    
    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
      console.error('💳 HuggingFace API rate limit reached. Please wait a moment and try again.');
    }
    
    return ['Unknown'];
  }
}

export async function identifyClothingType(imageBase64: string, mimeType: string): Promise<string> {
  const hf = getHuggingFaceClient();
  const validTypes = ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'ACCESSORY', 'UNDERWEAR', 'SWIMWEAR', 'SPORTSWEAR'];
  
  const prompt = `Based on this image description, classify the clothing item into ONE category.

VALID CATEGORIES: TOP, BOTTOM, DRESS, OUTERWEAR, SHOES, ACCESSORY, UNDERWEAR, SWIMWEAR, SPORTSWEAR

CLASSIFICATION RULES:
- TOP = Upper body garments (shirts, t-shirts, blouses, sweaters, hoodies)
- BOTTOM = Lower body garments (pants, jeans, shorts, skirts)
- DRESS = One-piece garments (dresses, jumpsuits)
- OUTERWEAR = Outer layers (jackets, coats, blazers)
- SHOES = Footwear (all types of shoes, boots, sandals)
- ACCESSORY = Non-garment items including ALL jewelry (necklaces, earrings, bracelets, rings, bags, hats, belts)
- UNDERWEAR = Under garments
- SWIMWEAR = Swimming attire
- SPORTSWEAR = Athletic clothing

CRITICAL: If it's jewelry (necklace, earring, bracelet, ring), return ACCESSORY.
Return ONLY the exact word from the list above. No explanations.`;

  try {
    const resp = await hf.analyzeImageWithPrompt(imageBase64, mimeType, prompt);
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
  const hf = getHuggingFaceClient();
  const validOccasions = ['CASUAL', 'WORK', 'FORMAL', 'PARTY', 'SPORTS', 'BEACH', 'DATE_NIGHT', 'TRAVEL'];
  const prompt = `Based on this image description, suggest the most appropriate occasion.
Return ONLY one of these exact values: ${validOccasions.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await hf.analyzeImageWithPrompt(imageBase64, mimeType, prompt);
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
  const hf = getHuggingFaceClient();
  const validSeasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'];
  const prompt = `Based on this image description, suggest the most appropriate season.
Return ONLY one of these exact values: ${validSeasons.join(', ')}.
Your response must be only the single word, with no other text.`;

  try {
    const resp = await hf.analyzeImageWithPrompt(imageBase64, mimeType, prompt);
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
  const hf = getHuggingFaceClient();
  const prompt = `Based on this image description, create a descriptive name for the clothing item.

Format: [Color] [Material/Style] [Item Type]
Examples: "Blue Denim Jeans", "White Cotton T-Shirt", "Black Leather Jacket", "Silver Chain Necklace"

Return ONLY the name. No quotes, no explanations. Just the descriptive name.`;

  try {
    const resp = await hf.analyzeImageWithPrompt(imageBase64, mimeType, prompt);
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

