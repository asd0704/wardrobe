import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, ItemHistory } from '@/models'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Get all user items
    const items = await Item.find({ userId })
      .lean()

    // Calculate analytics
    const totalItems = items.length
    const favoritesCount = items.filter(item => item.isFavorite).length
    const inLaundryCount = items.filter(item => item.laundryStatus === 'IN_LAUNDRY').length
    
    // Usage statistics
    const totalUsage = items.reduce((sum, item) => sum + (item.usageCount || 0), 0)
    const averageUsage = totalItems > 0 ? totalUsage / totalItems : 0
    
    // Most worn items
    const mostWornItems = items
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map(item => ({
        id: item._id,
        name: item.name,
        type: item.type,
        usageCount: item.usageCount || 0
      }))

    // Least worn items (worn less than 3 times)
    const underusedItems = items
      .filter(item => (item.usageCount || 0) < 3 && (item.usageCount || 0) > 0)
      .map(item => ({
        id: item._id,
        name: item.name,
        type: item.type,
        usageCount: item.usageCount || 0
      }))

    // Never worn items
    const neverWornItems = items
      .filter(item => (item.usageCount || 0) === 0)
      .map(item => ({
        id: item._id,
        name: item.name,
        type: item.type
      }))

    // Type distribution
    const typeDistribution = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Season distribution
    const seasonDistribution = items.reduce((acc, item) => {
      acc[item.season] = (acc[item.season] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Occasion distribution
    const occasionDistribution = items.reduce((acc, item) => {
      acc[item.occasion] = (acc[item.occasion] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Laundry status distribution
    const laundryDistribution = items.reduce((acc, item) => {
      acc[item.laundryStatus] = (acc[item.laundryStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentHistory = await ItemHistory.find({
      performedBy: userId,
      timestamp: { $gte: thirtyDaysAgo }
    })
      .sort({ timestamp: -1 })
      .lean()

    // Activity summary
    const activitySummary = recentHistory.reduce((acc, history) => {
      acc[history.action] = (acc[history.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        totalItems,
        favoritesCount,
        inLaundryCount,
        totalUsage,
        averageUsage: Math.round(averageUsage * 100) / 100
      },
      mostWornItems,
      underusedItems,
      neverWornItems,
      distributions: {
        type: typeDistribution,
        season: seasonDistribution,
        occasion: occasionDistribution,
        laundry: laundryDistribution
      },
      recentActivity: {
        summary: activitySummary,
        history: recentHistory.slice(0, 10) // Last 10 activities
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}