import { NextResponse } from 'next/server'

const CORS_ORIGINS = process.env.CORS_ORIGINS || '*'

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CORS_ORIGINS,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export function successResponse(data, status = 200) {
  const response = NextResponse.json(data, { status })
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function errorResponse(message, status = 400, details = null) {
  const response = NextResponse.json(
    { 
      error: message, 
      status,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    }, 
    { status }
  )
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function optionsResponse() {
  const response = new NextResponse(null, { status: 200 })
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// Remove MongoDB _id from response objects
export function sanitizeDocument(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return rest
}

export function sanitizeDocuments(docs) {
  return docs.map(sanitizeDocument)
}
