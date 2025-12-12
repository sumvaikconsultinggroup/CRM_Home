import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME

if (!MONGO_URL) {
  throw new Error('Please define the MONGO_URL environment variable')
}

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = await MongoClient.connect(MONGO_URL, {
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })

  const db = client.db(DB_NAME)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollection(collectionName) {
  const { db } = await connectToDatabase()
  return db.collection(collectionName)
}

// Collection names as constants
export const Collections = {
  USERS: 'users',
  CLIENTS: 'clients',
  MODULES: 'modules',
  PLANS: 'plans',
  LEADS: 'leads',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  EXPENSES: 'expenses',
  MODULE_REQUESTS: 'module_requests',
  WHITELABEL: 'whitelabel_settings',
  AUDIT_LOGS: 'audit_logs',
}
