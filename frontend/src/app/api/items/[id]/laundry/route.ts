import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, ItemHistory, AuditLog } from '@/models'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

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

    let newStatus: string
    let historyAction: string

    switch (action) {
      case 'mark_laundry':
        newStatus = 'IN_LAUNDRY'
        historyAction = 'MARKED_LAUNDRY'
        break
      case 'mark_clean':
        newStatus = 'CLEAN'
        historyAction = 'RETURNED'
        break
      case 'mark_worn':
        newStatus = 'IN_WARDROBE'
        historyAction = 'WORN'
        // Increment usage count
        await Item.findByIdAndUpdate(params.id, { 
          $inc: { usageCount: 1 } 
        })
        break
      case 'mark_away':
        newStatus = 'AWAY'
        historyAction = 'EDITED'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const item = await Item.findByIdAndUpdate(
      params.id,
      { laundryStatus: newStatus },
      { new: true }
    )

    // Create history entry
    await ItemHistory.create({
      itemId: params.id,
      action: historyAction,
      performedBy: authenticatedUserId,
      notes: `Status changed to ${newStatus}`
    })

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: `LAUNDRY_${action.toUpperCase()}`,
      payload: JSON.stringify({ itemId: params.id, newStatus }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating laundry status:', error)
    return NextResponse.json(
      { error: 'Failed to update laundry status' },
      { status: 500 }
    )
  }
}