import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    try {
      await connectDB()
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
        },
        { status: 503 }
      )
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create audit log
    const { AuditLog } = await import('@/models')
    await AuditLog.create({
      userId: user._id,
      action: 'USER_LOGIN',
      payload: JSON.stringify({ email }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }

    return NextResponse.json({
      success: true,
      user: userResponse
    })
  } catch (error: any) {
    console.error('Error logging in user:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Failed to log in',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}