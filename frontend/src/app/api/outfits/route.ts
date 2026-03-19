import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Outfit, User, Item, AuditLog } from '@/models'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function GET(request: NextRequest) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Build query
    let query: any = { userId: authenticatedUserId }

    const outfits = await Outfit.find(query)
      .populate({
        path: 'userId',
        select: 'id name email role',
        model: User
      })
      .populate({
        path: 'items.item',
        model: Item
      })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(outfits)
  } catch (error) {
    console.error('Error fetching outfits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outfits' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      userId,
      name,
      description,
      isPublic,
      items
    } = body

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!userId || !name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    const outfit = new Outfit({
      userId: authenticatedUserId,
      name,
      description,
      isPublic,
      items: items.map((item: any) => ({ item: item.id, position: item.position }))
    })

    await outfit.save()

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'CREATE_OUTFIT',
      payload: JSON.stringify({ outfitId: outfit._id }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(outfit, { status: 201 })
  } catch (error) {
    console.error('Error creating outfit:', error)
    return NextResponse.json(
      { error: 'Failed to create outfit' },
      { status: 500 }
    )
  }
}
