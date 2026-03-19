import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { createGeminiAPI } from '@/lib/gemini'
import { Item } from '@/models'
import fs from 'fs/promises';
import path from 'path';

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  return request.headers.get('x-user-id')
}

async function localImageToBase64(imageUrl: string): Promise<{base64: string, mimeType: string} | null> {
    try {
        const imagePath = path.join(process.cwd(), 'public', imageUrl);
        const file = await fs.readFile(imagePath);
        const mimeType = `image/${path.extname(imageUrl).slice(1) || 'jpeg'}`;
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

    const gemini = createGeminiAPI()

    const parts: any[] = [
      {
        text: `You are a personal stylist AI. Based on the following images of wardrobe items, suggest 3 complete outfits.

Request Details:
- Occasion: ${occasion || 'CASUAL'}
- Season: ${season || 'ALL_SEASON'}
- Weather: ${weather || 'Not specified'}
- Style Preference: ${style || 'Not specified'}

For each image, I will provide its ID and some details. Use this information to make better suggestions.

Please suggest 3 complete outfits that would work well. For each outfit:
1. Include 2-4 items that complement each other.
2. Consider color coordination, occasion appropriateness, and seasonal suitability.
3. For each outfit, list the IDs of the items used.

Return ONLY a JSON array with this structure:
[
  {
    "name": "Outfit Name",
    "description": "Brief description of outfit",
    "itemIds": ["item_id_1", "item_id_2", "item_id_3"],
    "reasoning": "Why this outfit works well"
  }
]

Use the exact item IDs from the available items list.`
      }
    ];

    for (const item of items) {
        const imageData = await localImageToBase64(item.thumbnailUrl);
        if (imageData) {
            parts.push({ text: `Item ID: ${item._id}, Type: ${item.type}, Colors: ${item.colors.join(', ')}, Occasion: ${item.occasion}, Season: ${item.season}` });
            parts.push({
                inlineData: {
                    mimeType: imageData.mimeType,
                    data: imageData.base64
                }
            });
        }
    }

    try {
      const response = await gemini.generateContentMultimodal(parts, {
        temperature: 0.7,
        maxTokens: 2048
      })

      let outfitSuggestions
      try {
  const jsonMatch = response.match(/\[[\s\S]*?\]/)
        if (jsonMatch) {
          outfitSuggestions = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No valid JSON found in response')
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        outfitSuggestions = generateFallbackOutfits(items, occasion, season)
      }

      const validItemIds = (items as any[]).map(item => (item._id as any).toString())
      const validatedSuggestions = outfitSuggestions.map((outfit: any) => ({
        ...outfit,
        itemIds: outfit.itemIds.filter((itemId: string) => validItemIds.includes(itemId))
      })).filter((outfit: any) => outfit.itemIds.length > 0)

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

  const outfits: Array<{name: string, description: string, itemIds: any[], reasoning: string}> = []

  if (tops.length > 0 && bottoms.length > 0) {
    const outfit: {name: string, description: string, itemIds: any[], reasoning: string} = {
      name: "Classic Casual",
      description: "A comfortable and versatile everyday outfit",
      itemIds: [(tops[0] as any)._id, (bottoms[0] as any)._id],
      reasoning: "Simple combination that works for most casual occasions"
    }
    if (outerwear.length > 0) {
      outfit.itemIds.push((outerwear[0] as any)._id)
    }
    outfits.push(outfit)
  }

  if (dresses.length > 0) {
    outfits.push({
      name: "Easy Dress",
      description: "A simple one-piece outfit",
      itemIds: [(dresses[0] as any)._id],
      reasoning: "Effortless style with minimal coordination needed"
    })
  }

  if (tops.length > 1 && bottoms.length > 1) {
    outfits.push({
      name: "Alternative Mix",
      description: "A different combination from your wardrobe",
      itemIds: [((tops[1] as any)?._id || (tops[0] as any)._id), ((bottoms[1] as any)?._id || (bottoms[0] as any)._id)],
      reasoning: "Mixing different pieces for variety"
    })
  }

  return outfits.slice(0, 3)
}