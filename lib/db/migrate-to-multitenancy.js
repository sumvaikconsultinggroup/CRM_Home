/**
 * Migration Script: Multi-Tenant Data Isolation
 * 
 * This script migrates existing client data to isolated databases
 * Run with: node lib/db/migrate-to-multitenancy.js
 */

const { MongoClient } = require('mongodb')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MAIN_DB_NAME = process.env.DB_NAME || 'buildcrm'

// Collections that need to be migrated to client databases
const CLIENT_COLLECTIONS = [
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

/**
 * Generate new Client ID in format CL-XXXXXX
 */
function generateClientId(existingIds) {
  let clientId
  let isUnique = false
  
  while (!isUnique) {
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    clientId = `CL-${randomNum}`
    if (!existingIds.has(clientId)) {
      isUnique = true
      existingIds.add(clientId)
    }
  }
  
  return clientId
}

async function migrateToMultiTenancy() {
  console.log('🚀 Starting Multi-Tenant Migration...\n')
  
  const client = await MongoClient.connect(MONGO_URL)
  const mainDb = client.db(MAIN_DB_NAME)
  
  try {
    // Step 1: Get all existing clients
    const clientsCollection = mainDb.collection('clients')
    const usersCollection = mainDb.collection('users')
    const clients = await clientsCollection.find({}).toArray()
    
    console.log(`Found ${clients.length} clients to migrate\n`)
    
    const existingClientIds = new Set()
    const clientIdMapping = {} // old id -> new clientId
    
    // Step 2: Generate new Client IDs and update clients
    for (const clientDoc of clients) {
      const oldId = clientDoc.id
      let newClientId
      
      // Check if client already has new format ID
      if (clientDoc.clientId && /^CL-\d{6}$/.test(clientDoc.clientId)) {
        newClientId = clientDoc.clientId
        existingClientIds.add(newClientId)
        console.log(`Client "${clientDoc.businessName}" already has ID: ${newClientId}`)
      } else {
        // Generate new ID
        newClientId = generateClientId(existingClientIds)
        
        // Update client document with new clientId
        await clientsCollection.updateOne(
          { id: oldId },
          { 
            $set: { 
              clientId: newClientId,
              databaseName: newClientId,
              updatedAt: new Date()
            } 
          }
        )
        console.log(`✅ Assigned ${newClientId} to "${clientDoc.businessName}" (old: ${oldId})`)
      }
      
      clientIdMapping[oldId] = newClientId
      
      // Also update users collection
      await usersCollection.updateMany(
        { clientId: oldId },
        { $set: { clientId: newClientId, databaseName: newClientId } }
      )
    }
    
    console.log('\n📦 Migrating client data to isolated databases...\n')
    
    // Step 3: Migrate data for each client
    for (const clientDoc of clients) {
      const oldClientId = clientDoc.id
      const newClientId = clientIdMapping[oldClientId]
      
      console.log(`\n📁 Migrating data for ${clientDoc.businessName} (${newClientId})...`)
      
      // Create client's database
      const clientDb = client.db(newClientId)
      
      let totalDocuments = 0
      
      // Migrate each collection
      for (const collectionName of CLIENT_COLLECTIONS) {
        try {
          const sourceCollection = mainDb.collection(collectionName)
          
          // Find all documents belonging to this client
          const documents = await sourceCollection.find({ 
            clientId: { $in: [oldClientId, newClientId] }
          }).toArray()
          
          if (documents.length > 0) {
            // Update clientId in documents and insert into client's database
            const targetCollection = clientDb.collection(collectionName)
            
            const updatedDocs = documents.map(doc => ({
              ...doc,
              clientId: newClientId, // Ensure new clientId
              _migratedAt: new Date()
            }))
            
            // Use insertMany with ordered: false to continue on duplicates
            try {
              await targetCollection.insertMany(updatedDocs, { ordered: false })
              console.log(`   ✅ ${collectionName}: ${documents.length} documents`)
              totalDocuments += documents.length
            } catch (insertError) {
              // Handle duplicate key errors gracefully
              if (insertError.code === 11000) {
                console.log(`   ⚠️ ${collectionName}: ${documents.length} documents (some duplicates skipped)`)
              } else {
                throw insertError
              }
            }
          }
        } catch (error) {
          if (error.code !== 26) { // 26 = NamespaceNotFound (collection doesn't exist)
            console.error(`   ❌ Error migrating ${collectionName}:`, error.message)
          }
        }
      }
      
      console.log(`   📊 Total: ${totalDocuments} documents migrated`)
      
      // Create indexes
      await createIndexes(clientDb)
    }
    
    // Step 4: Clean up - remove client-specific data from main database
    console.log('\n🧹 Cleaning up main database...')
    
    for (const collectionName of CLIENT_COLLECTIONS) {
      try {
        const collection = mainDb.collection(collectionName)
        const result = await collection.deleteMany({
          clientId: { $in: Object.values(clientIdMapping) }
        })
        if (result.deletedCount > 0) {
          console.log(`   Removed ${result.deletedCount} documents from ${collectionName}`)
        }
      } catch (error) {
        // Ignore if collection doesn't exist
      }
    }
    
    console.log('\n✅ Migration completed successfully!')
    console.log('\n📋 Client ID Mapping:')
    for (const [oldId, newId] of Object.entries(clientIdMapping)) {
      const clientDoc = clients.find(c => c.id === oldId)
      console.log(`   ${clientDoc?.businessName || oldId}: ${oldId} → ${newId}`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.close()
  }
}

async function createIndexes(db) {
  const indexDefinitions = {
    'leads': [{ email: 1 }, { status: 1 }, { createdAt: -1 }],
    'projects': [{ status: 1 }, { createdAt: -1 }],
    'tasks': [{ status: 1 }, { dueDate: 1 }],
    'expenses': [{ date: -1 }, { category: 1 }],
    'contacts': [{ email: 1 }, { phone: 1 }],
    'calendar_events': [{ date: 1 }],
    'wf_inventory': [{ sku: 1 }, { category: 1 }],
    'wf_customers': [{ email: 1 }],
    'wf_projects': [{ status: 1 }],
    'wf_quotations': [{ status: 1 }],
    'wf_orders': [{ status: 1 }],
    'wf_invoices': [{ status: 1 }]
  }
  
  for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
    try {
      const collection = db.collection(collectionName)
      for (const index of indexes) {
        await collection.createIndex(index)
      }
    } catch (error) {
      // Ignore index creation errors
    }
  }
}

// Run migration
migrateToMultiTenancy()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })
