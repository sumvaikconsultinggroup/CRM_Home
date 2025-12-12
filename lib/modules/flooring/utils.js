import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, generateSampleFlooringProducts, generateSampleSuppliers, generateSampleInventory } from './constants'

export async function initializeFlooringModule(clientId) {
  try {
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    
    // Check if data already exists for this client
    const existingProducts = await productsCollection.countDocuments({ clientId })
    
    if (existingProducts === 0) {
      // Generate sample products
      const products = generateSampleFlooringProducts(clientId).map(p => ({
        ...p,
        id: uuidv4()
      }))
      await productsCollection.insertMany(products)
      
      // Generate sample suppliers
      const suppliers = generateSampleSuppliers(clientId).map(s => ({
        ...s,
        id: uuidv4()
      }))
      await suppliersCollection.insertMany(suppliers)
      
      // Generate sample inventory
      const inventory = generateSampleInventory(clientId, products).map(i => ({
        ...i,
        id: uuidv4()
      }))
      await inventoryCollection.insertMany(inventory)
      
      console.log(`Flooring module initialized for client ${clientId}`)
      return { success: true, message: 'Flooring module initialized with sample data' }
    }
    
    return { success: true, message: 'Flooring module already initialized' }
  } catch (error) {
    console.error('Error initializing flooring module:', error)
    return { success: false, error: error.message }
  }
}

export async function checkFlooringModuleAccess(clientId) {
  const clientsCollection = await getCollection('clients')
  const modulesCollection = await getCollection('modules')
  
  const client = await clientsCollection.findOne({ id: clientId })
  if (!client) return { hasAccess: false, error: 'Client not found' }
  
  // Find the Wooden Flooring module
  const flooringModule = await modulesCollection.findOne({ name: 'Wooden Flooring' })
  if (!flooringModule) return { hasAccess: false, error: 'Module not found' }
  
  // Check if client has access to this module
  const hasAccess = client.modules?.includes(flooringModule.id)
  
  return { hasAccess, moduleId: flooringModule.id }
}
