import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, FlooringCategories, generateFlooringId } from '@/lib/db/flooring-schema'

// GET - Fetch all products or filter by category
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const status = searchParams.get('status') || 'active'

    const products = await getCollection(FlooringCollections.PRODUCTS)
    
    const query = {}
    if (clientId) query.clientId = clientId
    if (category) query.category = category
    if (status !== 'all') query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    }

    const result = await products.find(query).sort({ category: 1, name: 1 }).toArray()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Products GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(request) {
  try {
    const body = await request.json()
    const products = await getCollection(FlooringCollections.PRODUCTS)

    const product = {
      id: generateFlooringId('FLP'),
      sku: body.sku || generateFlooringId('SKU'),
      name: body.name,
      brand: body.brand || '',
      category: body.category,
      subcategory: body.subcategory || '',
      description: body.description || '',
      specifications: {
        thickness: body.specifications?.thickness || '',
        width: body.specifications?.width || '',
        length: body.specifications?.length || '',
        wearLayer: body.specifications?.wearLayer || '',
        finish: body.specifications?.finish || '',
        installation: body.specifications?.installation || [],
        warranty: body.specifications?.warranty || '',
        waterResistant: body.specifications?.waterResistant || false,
        scratchResistant: body.specifications?.scratchResistant || false
      },
      pricing: {
        costPrice: body.pricing?.costPrice || 0,
        sellingPrice: body.pricing?.sellingPrice || 0,
        unit: body.pricing?.unit || 'sqft',
        sqftPerBox: body.pricing?.sqftPerBox || 20,
        boxPrice: body.pricing?.boxPrice || 0
      },
      stock: {
        quantity: body.stock?.quantity || 0,
        reorderLevel: body.stock?.reorderLevel || 100,
        warehouse: body.stock?.warehouse || 'main'
      },
      images: body.images || [],
      supplier: body.supplier || null,
      clientId: body.clientId,
      status: body.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await products.insertOne(product)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Flooring Products POST Error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const products = await getCollection(FlooringCollections.PRODUCTS)
    
    const result = await products.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Products PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE - Delete product
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const products = await getCollection(FlooringCollections.PRODUCTS)
    
    // Soft delete - change status to discontinued
    const result = await products.findOneAndUpdate(
      { id },
      { $set: { status: 'discontinued', updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Product discontinued', product: result })
  } catch (error) {
    console.error('Flooring Products DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
