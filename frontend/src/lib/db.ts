import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard'

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB is already connected.')
    return
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    isConnected = true
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

// Connection state management
let isConnected = false

mongoose.connection.on('connected', () => {
  isConnected = true
  console.log('MongoDB connected successfully')
})

mongoose.connection.on('error', (err) => {
  isConnected = false
  console.error('MongoDB connection error:', err)
})


mongoose.connection.on('disconnected', () => {
  isConnected = false
  console.log('MongoDB disconnected')
})

export { connectDB, mongoose }
export const db = mongoose