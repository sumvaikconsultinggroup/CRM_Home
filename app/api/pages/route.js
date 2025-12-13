import { NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, sanitizeDocuments } from '@/lib/utils/response'

// GET - Fetch all pages or a specific page by slug
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    
    const pagesCollection = await getCollection('pages')
    
    if (slug) {
      const page = await pagesCollection.findOne({ slug, published: true })
      if (!page) {
        return errorResponse('Page not found', 404)
      }
      return successResponse(page)
    }
    
    const pages = await pagesCollection.find({ published: true }).sort({ createdAt: -1 }).toArray()
    return successResponse(sanitizeDocuments(pages))
  } catch (error) {
    console.error('Pages API Error:', error)
    return errorResponse('Failed to fetch pages', 500)
  }
}

// POST - Create a new page (for admin)
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, slug, content, type, published = false } = body
    
    if (!title || !slug || !content) {
      return errorResponse('Title, slug, and content are required', 400)
    }
    
    const pagesCollection = await getCollection('pages')
    
    // Check if slug already exists
    const existing = await pagesCollection.findOne({ slug })
    if (existing) {
      return errorResponse('A page with this slug already exists', 400)
    }
    
    const page = {
      id: `page_${Date.now()}`,
      title,
      slug,
      content,
      type: type || 'page', // page, blog, legal
      published,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await pagesCollection.insertOne(page)
    return successResponse(page)
  } catch (error) {
    console.error('Pages POST Error:', error)
    return errorResponse('Failed to create page', 500)
  }
}

// PUT - Update a page
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, title, slug, content, type, published } = body
    
    if (!id) {
      return errorResponse('Page ID is required', 400)
    }
    
    const pagesCollection = await getCollection('pages')
    
    const updateData = {
      updatedAt: new Date()
    }
    
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (published !== undefined) updateData.published = published
    
    await pagesCollection.updateOne({ id }, { $set: updateData })
    
    const updated = await pagesCollection.findOne({ id })
    return successResponse(updated)
  } catch (error) {
    console.error('Pages PUT Error:', error)
    return errorResponse('Failed to update page', 500)
  }
}

// DELETE - Delete a page
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return errorResponse('Page ID is required', 400)
    }
    
    const pagesCollection = await getCollection('pages')
    await pagesCollection.deleteOne({ id })
    
    return successResponse({ message: 'Page deleted successfully' })
  } catch (error) {
    console.error('Pages DELETE Error:', error)
    return errorResponse('Failed to delete page', 500)
  }
}
