import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getOpenAIClient } from '@/lib/openai'
import { Item } from '@/models'
import fs from 'fs/promises';
import path from 'path';

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  return request.headers.get('x-user-id')
}

async function localImageToBase64(imageUrl: string): Promise<{base64: string, mimeType: string} | null> {
    try {
        // Remove leading slash if present
        const cleanUrl = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
        const imagePath = path.join(process.cwd(), 'public', cleanUrl);
        
        // Check if file exists
        try {
            await fs.access(imagePath);
        } catch {
            // Try without 'thumb-' prefix if it's a thumbnail
            if (cleanUrl.includes('thumb-')) {
                const altPath = imagePath.replace(/thumb-/, '');
                try {
                    await fs.access(altPath);
                    const file = await fs.readFile(altPath);
                    const mimeType = 'image/jpeg'; // All processed images are JPEG
                    const base64 = file.toString('base64');
                    return { base64, mimeType };
                } catch {
                    console.error(`Image not found at ${imagePath} or ${altPath}`);
                    return null;
                }
            }
            console.error(`Image not found at ${imagePath}`);
            return null;
        }
        
        const file = await fs.readFile(imagePath);
        // All processed images are JPEG
        const mimeType = 'image/jpeg';
        const base64 = file.toString('base64');
        return { base64, mimeType };
    } catch (error) {
        console.error(`Failed to read image at ${imageUrl}:`, error);
        return null;
    }
}

export async function POST(request: NextRequest) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, occasion, season, weather, style } = await request.json()

    if (!userId || userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'User ID is required and must match authenticated user' },
        { status: 400 }
      )
    }

    await connectDB()

    const items = await Item.find({ 
      userId,
      laundryStatus: 'IN_WARDROBE'
    }).lean()

    if (items.length < 2) {
      return NextResponse.json(
        { error: 'Not enough items available in wardrobe for a suggestion.' },
        { status: 400 }
      )
    }

    // Check if OpenAI API is available
    let openAIAvailable = false
    let openai: any = null
    
    try {
      openai = getOpenAIClient()
      if (openai && process.env.OPENAI_API_KEY) {
        openAIAvailable = true
      } else {
        console.warn('OpenAI API key not available. Using fallback outfit generation.')
      }
    } catch (error) {
      console.error('OpenAI API initialization failed:', error)
      openAIAvailable = false
    }

    // If OpenAI is not available, use fallback immediately
    if (!openAIAvailable) {
      const fallbackOutfits = generateFallbackOutfits(items, occasion, season)
      return NextResponse.json({
        success: true,
        suggestions: fallbackOutfits,
        fallback: true
      })
    }

    // Build a text description of all items for OpenAI
    let itemsDescription = `Wardrobe Items:\n`
    for (const item of items) {
      itemsDescription += `- Item ID: "${String((item as any)._id)}", Type: ${item.type}, Colors: ${Array.isArray(item.colors) ? item.colors.join(', ') : 'Unknown'}, Occasion: ${item.occasion || 'CASUAL'}, Season: ${item.season || 'ALL_SEASON'}\n`
    }
    
    const prompt = `You are an expert personal stylist. Based on the wardrobe items below, suggest 3 complete, stylish outfits.

${itemsDescription}

CONTEXT:
- Occasion: ${occasion || 'CASUAL'}
- Season: ${season || 'ALL_SEASON'}
- Weather: ${weather || 'Mild'}
- Style Preference: ${style || 'Casual'}

OUTFIT REQUIREMENTS:
For each of the 3 outfits you suggest:
1. Include 2-4 items that work well together
2. Ensure color coordination and style harmony
3. Match the occasion and season requirements
4. Use the EXACT item IDs provided (as strings)

RESPONSE FORMAT:
Return ONLY a valid JSON array. No markdown, no code blocks, no explanations outside the JSON.

[
  {
    "name": "Outfit Name Here",
    "description": "Brief description of the outfit style",
    "itemIds": ["exact_item_id_1", "exact_item_id_2", "exact_item_id_3"],
    "reasoning": "Why these items work well together"
  },
  {
    "name": "Second Outfit Name",
    "description": "Description",
    "itemIds": ["item_id_1", "item_id_2"],
    "reasoning": "Reasoning"
  },
  {
    "name": "Third Outfit Name",
    "description": "Description",
    "itemIds": ["item_id_1", "item_id_2", "item_id_3"],
    "reasoning": "Reasoning"
  }
]

IMPORTANT: Use the exact item IDs shown above. Return valid JSON only.`

    try {
      const openai = getOpenAIClient()
      // Use text model to generate outfit suggestions
      const response = await openai.generateText(prompt)

      let outfitSuggestions
      try {
        // Try to extract JSON from response
        let jsonString = response.trim();
        
        // Remove markdown code blocks if present
        jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to find JSON array
        const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          outfitSuggestions = JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing the whole response
          outfitSuggestions = JSON.parse(jsonString);
        }
        
        // Validate it's an array
        if (!Array.isArray(outfitSuggestions)) {
          throw new Error('Response is not an array');
        }
        
        // Ensure each outfit has required fields. For privacy/consistency we leave name empty unless provided.
        outfitSuggestions = outfitSuggestions.map((outfit: any) => ({
          name: outfit.name || '',
          description: outfit.description || '',
          // Coerce itemIds to strings to ensure consistent comparison with DB ids
          itemIds: Array.isArray(outfit.itemIds) ? outfit.itemIds.map((id: any) => String(id)) : [],
          reasoning: outfit.reasoning || ''
        }));
        
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Response was:', response.substring(0, 500));
        outfitSuggestions = generateFallbackOutfits(items, occasion, season);
      }

  const validItemIds = items.map(item => String((item as any)._id))
      let validatedSuggestions = outfitSuggestions.map((outfit: any) => ({
        ...outfit,
        // Ensure we compare strings and keep only valid ids
        itemIds: (outfit.itemIds || []).map((id: any) => String(id)).filter((itemId: string) => validItemIds.includes(itemId))
      })).filter((outfit: any) => (outfit.itemIds || []).length > 0)

      // If AI returned fewer than 3 suggestions, supplement with fallback outfits (deduped)
      if (validatedSuggestions.length < 3) {
        const fallback = generateFallbackOutfits(items, occasion, season)
        for (const f of fallback) {
          // skip if a suggestion with same itemIds already exists
          const fIds = (f.itemIds || []).map((id: any) => String(id))
          const exists = validatedSuggestions.some((s: any) => {
            const sIds = (s.itemIds || []).map((id: any) => String(id))
            return sIds.length === fIds.length && sIds.every((v: string, i: number) => v === fIds[i])
          })
          if (!exists) {
            validatedSuggestions.push(f)
          }
          if (validatedSuggestions.length >= 3) break
        }
      }

      // Ensure we return at most 3 suggestions
      validatedSuggestions = validatedSuggestions.slice(0, 3)

      return NextResponse.json({
        success: true,
        suggestions: validatedSuggestions,
      })

    } catch (error) {
      console.error('AI outfit generation failed:', error)
      const fallbackOutfits = generateFallbackOutfits(items, occasion, season)
      
      return NextResponse.json({
        success: true,
        suggestions: fallbackOutfits,
        fallback: true
      })
    }

  } catch (error) {
    console.error('Error generating outfit suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate outfit suggestions' },
      { status: 500 }
    )
  }
}

function generateFallbackOutfits(items: any[], occasion?: string, season?: string) {
  const tops = items.filter(item => item.type === 'TOP')
  const bottoms = items.filter(item => item.type === 'BOTTOM')
  const dresses = items.filter(item => item.type === 'DRESS')
  const outerwear = items.filter(item => item.type === 'OUTERWEAR')

  const outfits: any[] = []

  if (tops.length > 0 && bottoms.length > 0) {
    const outfit: {name: string, description: string, itemIds: any[], reasoning: string} = {
      name: "",
      description: "A comfortable and versatile everyday outfit",
      itemIds: [String((tops[0] as any)._id), String((bottoms[0] as any)._id)],
      reasoning: "Simple combination that works for most casual occasions"
    }
    if (outerwear.length > 0) {
      outfit.itemIds.push(String((outerwear[0] as any)._id))
    }
    outfits.push(outfit)
  }

  if (dresses.length > 0) {
    outfits.push({
      name: "",
      description: "A simple one-piece outfit",
      itemIds: [String((dresses[0] as any)._id)],
      reasoning: "Effortless style with minimal coordination needed"
    })
  }

  if (tops.length > 1 && bottoms.length > 1) {
    outfits.push({
      name: "",
      description: "A different combination from your wardrobe",
      itemIds: [String(((tops[1]?._id || tops[0]._id) as any)), String(((bottoms[1]?._id || bottoms[0]._id) as any))],
      reasoning: "Mixing different pieces for variety"
    })
  }

  return outfits.slice(0, 3)
}