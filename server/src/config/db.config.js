import mongoose from 'mongoose'
import { env } from './env.config.js'

export async function connectDb() {
  try {
    // Fail fast instead of the default 30s.
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 })
    // Name only: the URI holds the password.
    console.log(`MongoDB connected: ${mongoose.connection.name}`)
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

export async function disconnectDb() {
  await mongoose.disconnect()
  console.log('MongoDB disconnected')
}
