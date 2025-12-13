import { MongoClient } from 'mongodb'

// Connection cache for client databases
const clientDbCache = new Map()
let mainDbClient = null

// Main platform database name
const MAIN_DB_NAME = process.env.DB_NAME || 'buildcrm'

/**
 * Get the main platform database connection
 * Used for: clients, users, modules, settings, plans
 */
export async function getMainDb() {
  if (!mainDbClient) {
    mainDbClient = await MongoClient.connect(process.env.MONGO_URL)
  }
  return mainDbClient.db(MAIN_DB_NAME)
}

/**
 * Get a client-specific database connection
 * Each client has their own isolated database
 * @param {string} clientId - The client ID (e.g., CL-123456)
 */
export async function getClientDb(clientId) {
  if (!clientId) {
    throw new Error('Client ID is required for database access')
  }

  // Validate client ID format
  if (!isValidClientId(clientId)) {
    throw new Error(`Invalid client ID format: ${clientId}`)
  }

  // Check cache first
  if (clientDbCache.has(clientId)) {
    return clientDbCache.get(clientId)
  }

  // Create new connection for client database
  const client = await MongoClient.connect(process.env.MONGO_URL)
  const db = client.db(clientId) // Database name is the client ID
  
  // Cache the connection
  clientDbCache.set(clientId, db)
  
  return db
}

/**
 * Get collection from client's database
 * @param {string} clientId - The client ID
 * @param {string} collectionName - The collection name
 */
export async function getClientCollection(clientId, collectionName) {
  const db = await getClientDb(clientId)
  return db.collection(collectionName)
}

/**
 * Get collection from main platform database
 * @param {string} collectionName - The collection name
 */
export async function getMainCollection(collectionName) {
  const db = await getMainDb()
  return db.collection(collectionName)
}

/**
 * Generate a unique Client ID in format CL-XXXXXX
 * @returns {Promise<string>} Unique client ID
 */
export async function generateUniqueClientId() {
  const db = await getMainDb()
  const clientsCollection = db.collection('clients')
  
  let clientId
  let isUnique = false
  let attempts = 0
  const maxAttempts = 100
  
  while (!isUnique && attempts < maxAttempts) {
    // Generate 6 random digits
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    clientId = `CL-${randomNum}`
    
    // Check if ID already exists
    const existing = await clientsCollection.findOne({ clientId })
    if (!existing) {
      isUnique = true
    }
    attempts++
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique client ID after maximum attempts')
  }
  
  return clientId
}

/**
 * Validate client ID format
 * @param {string} clientId - The client ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return false
  // Format: CL-XXXXXX where X is a digit
  const pattern = /^CL-\d{6}$/
  return pattern.test(clientId)
}

/**
 * Initialize a new client database with required collections
 * @param {string} clientId - The client ID
 */
export async function initializeClientDatabase(clientId) {
  const db = await getClientDb(clientId)
  
  // Create indexes for common collections
  const collections = [
    { name: 'leads', indexes: [{ key: { email: 1 } }, { key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'projects', indexes: [{ key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'tasks', indexes: [{ key: { status: 1 } }, { key: { dueDate: 1 } }] },
    { name: 'expenses', indexes: [{ key: { date: -1 } }, { key: { category: 1 } }] },
    { name: 'contacts', indexes: [{ key: { email: 1 } }, { key: { phone: 1 } }] },
    { name: 'notes', indexes: [{ key: { createdAt: -1 } }] },
    { name: 'calendar_events', indexes: [{ key: { date: 1 } }] },
    { name: 'chat_messages', indexes: [{ key: { conversationId: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'conversations', indexes: [{ key: { updatedAt: -1 } }] },
    { name: 'team_members', indexes: [{ key: { email: 1 } }] },
    { name: 'integrations', indexes: [{ key: { type: 1 } }] },
    { name: 'activity_logs', indexes: [{ key: { createdAt: -1 } }] },
    // Module-specific collections
    { name: 'wf_inventory', indexes: [{ key: { sku: 1 } }, { key: { category: 1 } }] },
    { name: 'wf_customers', indexes: [{ key: { email: 1 } }, { key: { phone: 1 } }] },
    { name: 'wf_projects', indexes: [{ key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'wf_quotations', indexes: [{ key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'wf_orders', indexes: [{ key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'wf_invoices', indexes: [{ key: { status: 1 } }, { key: { createdAt: -1 } }] },
    { name: 'wf_vendors', indexes: [{ key: { category: 1 } }] },
    { name: 'wf_schedule', indexes: [{ key: { scheduledDate: 1 } }] },
  ]
  
  for (const col of collections) {
    try {
      // Create collection if it doesn't exist
      await db.createCollection(col.name)
      
      // Create indexes
      const collection = db.collection(col.name)
      for (const index of col.indexes) {
        await collection.createIndex(index.key)
      }
    } catch (error) {
      // Collection might already exist, that's okay
      if (error.code !== 48) { // 48 = NamespaceExists
        console.error(`Error creating collection ${col.name}:`, error.message)
      }
    }
  }
  
  console.log(`Initialized database for client: ${clientId}`)
  return true
}

/**
 * Delete all data for a client (when client is deleted)
 * @param {string} clientId - The client ID
 */
export async function deleteClientDatabase(clientId) {
  if (!isValidClientId(clientId)) {
    throw new Error(`Invalid client ID: ${clientId}`)
  }
  
  const client = await MongoClient.connect(process.env.MONGO_URL)
  const db = client.db(clientId)
  
  // Drop the entire database
  await db.dropDatabase()
  
  // Remove from cache
  clientDbCache.delete(clientId)
  
  console.log(`Deleted database for client: ${clientId}`)
  return true
}

/**
 * List all databases (for admin purposes)
 */
export async function listClientDatabases() {
  const client = await MongoClient.connect(process.env.MONGO_URL)
  const adminDb = client.db().admin()
  const result = await adminDb.listDatabases()
  
  // Filter to only client databases
  const clientDbs = result.databases.filter(db => isValidClientId(db.name))
  
  return clientDbs.map(db => ({
    clientId: db.name,
    sizeOnDisk: db.sizeOnDisk,
    empty: db.empty
  }))
}

// Collections that belong to main platform database
export const MAIN_DB_COLLECTIONS = [
  'clients',
  'users', 
  'modules',
  'settings',
  'plans',
  'module_requests',
  'admin_logs',
  'webhook_logs'
]

// Collections that belong to client-specific database
export const CLIENT_DB_COLLECTIONS = [
  'leads',
  'projects',
  'tasks',
  'expenses',
  'contacts',
  'notes',
  'calendar_events',
  'chat_messages',
  'conversations',
  'team_members',
  'integrations',
  'activity_logs',
  // Module-specific
  'wf_inventory',
  'wf_customers',
  'wf_projects',
  'wf_quotations',
  'wf_orders',
  'wf_invoices',
  'wf_vendors',
  'wf_schedule',
  'wf_whatsapp_logs'
]

export default {
  getMainDb,
  getClientDb,
  getClientCollection,
  getMainCollection,
  generateUniqueClientId,
  isValidClientId,
  initializeClientDatabase,
  deleteClientDatabase,
  listClientDatabases,
  MAIN_DB_COLLECTIONS,
  CLIENT_DB_COLLECTIONS
}
