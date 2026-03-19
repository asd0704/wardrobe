import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, User, ItemHistory, AuditLog } from '@/models'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    const item = await Item.findById(params.id)
      .populate({
        path: 'userId',
        select: 'id name email',
        model: User
      })
      .lean()

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (item.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get item history
    const history = await ItemHistory.find({ itemId: params.id })
      .populate({
        path: 'performedBy',
        select: 'id name',
        model: User
      })
      .sort({ timestamp: -1 })
      .lean()

    const itemWithHistory = {
      ...item,
      itemHistory: history
    }

    return NextResponse.json(itemWithHistory)
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      colors,
      type,
      occasion,
      season,
      isFavorite
    } = body

    // Connect to database
    await connectDB()

    const existingItem = await Item.findById(params.id)

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (existingItem.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (colors !== undefined) updateData.colors = colors
    if (type !== undefined) updateData.type = type
    if (occasion !== undefined) updateData.occasion = occasion
    if (season !== undefined) updateData.season = season
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite

    const item = await Item.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )

    // Create history entry
    await ItemHistory.create({
      itemId: params.id,
      action: 'EDITED',
      performedBy: authenticatedUserId,
      notes: 'Item updated'
    })

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'UPDATE_ITEM',
      payload: JSON.stringify({ itemId: params.id, changes: updateData }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    const existingItem = await Item.findById(params.id)

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (existingItem.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await Item.findByIdAndDelete(params.id)

    // Create history entry
    await ItemHistory.create({
      itemId: params.id,
      action: 'DELETED',
      performedBy: authenticatedUserId,
      notes: 'Item deleted'
    })

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'DELETE_ITEM',
      payload: JSON.stringify({ itemId: params.id }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}