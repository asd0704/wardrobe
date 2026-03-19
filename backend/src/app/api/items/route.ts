import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, User } from '@/models'

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
    const type = searchParams.get('type')
    const season = searchParams.get('season')
    const laundryStatus = searchParams.get('laundryStatus')
    const isFavorite = searchParams.get('isFavorite')
    const search = searchParams.get('search')

    // Connect to database
    await connectDB()

    // Build query
    let query: any = { userId: authenticatedUserId }

    if (userId && userId !== authenticatedUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (type && type !== 'ALL') {
      query.type = type
    }

    if (season && season !== 'ALL') {
      query.season = season
    }

    if (laundryStatus && laundryStatus !== 'ALL') {
      query.laundryStatus = laundryStatus
    }

    if (isFavorite === 'true') {
      query.isFavorite = true
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    const items = await Item.find(query)
      .populate({
        path: 'userId',
        select: 'id name email role',
        model: User
      })
      .sort({ createdAt: -1 })
      .lean()
    // Hide names that were set to the neutral placeholder so the UI doesn't display them
    const publicItems = items.map((it: any) => ({
      ...it,
      name: it.name === 'Untitled Item' ? '' : it.name
    }))

    return NextResponse.json(publicItems)
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
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
      filename,
      objectUrl,
      thumbnailUrl,
      processedUrl,
      colors,
      type,
      occasion,
      season
    } = body

    if (userId && userId !== authenticatedUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!userId || !filename || !objectUrl || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    const item = new Item({
      userId: authenticatedUserId,
      name: name || filename,
      filename,
      objectUrl,
      thumbnailUrl,
      processedUrl,
      colors: colors || [],
      type,
      occasion: occasion || 'CASUAL',
      season: season || 'ALL_SEASON',
      laundryStatus: 'IN_WARDROBE',
      usageCount: 0,
      isFavorite: false
    })

    await item.save()

    // Create history entry
    const { ItemHistory } = await import('@/models')
    await ItemHistory.create({
      itemId: item._id,
      action: 'CREATED',
      performedBy: authenticatedUserId,
      notes: 'Item created'
    })

    // Create audit log
    const { AuditLog } = await import('@/models')
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'CREATE_ITEM',
      payload: JSON.stringify({ itemId: item._id }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}