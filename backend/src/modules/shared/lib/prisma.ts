import 'dotenv/config'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

export default prisma
