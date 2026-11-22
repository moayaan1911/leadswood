import 'dotenv/config'

// All environment variables are read here.
export const env = {
  isTest: process.env.NODE_ENV === "test",
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
}

// Fail at startup with a clear reason.
if (!env.mongoUri) throw new Error('MONGO_URI is missing in server/.env')
if (!env.jwtSecret) throw new Error('JWT_SECRET is missing in server/.env')
