import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local')
}

declare global {
  var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null }
}

let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m)
  }
  cached.conn = await cached.promise
  return cached.conn
}
