import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
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
  } catch (error) {
    console.error('Error logging in user:', error)
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    )
  }
}