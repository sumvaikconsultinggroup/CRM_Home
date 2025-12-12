import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'
import { initializeFlooringModule } from '@/lib/modules/flooring/utils'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    await initializeFlooringModule(user.clientId)
    
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    
    const suppliers = await suppliersCollection.find({ clientId: user.clientId, active: true }).toArray()
    
    return successResponse(sanitizeDocuments(suppliers))
  } catch (error) {
    console.error('Flooring Suppliers GET Error:', error)
    return errorResponse('Failed to fetch suppliers', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { name, contactPerson, email, phone, address, gstNumber, leadTime, minimumOrder, paymentTerms, specialties, deliveryAreas } = body
    
    if (!name || !email) {
      return errorResponse('Name and email are required', 400)
    }
    
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    
    const supplier = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      contactPerson: contactPerson || '',
      email,
      phone: phone || '',
      address: address || '',
      gstNumber: gstNumber || '',
      rating: 0,
      leadTime: leadTime || 7,
      minimumOrder: minimumOrder || 0,
      paymentTerms: paymentTerms || 'Net 30',
      specialties: specialties || [],
      deliveryAreas: deliveryAreas || [],
      active: true,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await suppliersCollection.insertOne(supplier)
    
    return successResponse(sanitizeDocument(supplier), 201)
  } catch (error) {
    console.error('Flooring Suppliers POST Error:', error)
    return errorResponse('Failed to create supplier', 500, error.message)
  }
}
