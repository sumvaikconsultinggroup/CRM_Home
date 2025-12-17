/**
 * Centralized Validation Utility
 * Provides validation functions for forms across the application
 */

// ============================================
// EMAIL VALIDATION
// ============================================
export function validateEmail(email, required = true) {
  if (!email || !email.trim()) {
    if (required) {
      return { valid: false, error: 'Email is required' }
    }
    return { valid: true, error: null }
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  
  return { valid: true, error: null }
}

// ============================================
// PHONE VALIDATION (International)
// ============================================
export function validatePhone(phone, required = true) {
  if (!phone || !phone.trim()) {
    if (required) {
      return { valid: false, error: 'Phone number is required' }
    }
    return { valid: true, error: null }
  }
  
  // Remove all non-digit characters except + at the start
  const cleanPhone = phone.trim().replace(/(?!^\+)\D/g, '')
  
  // International phone: 7-15 digits (with optional + prefix)
  const phoneRegex = /^\+?[1-9]\d{6,14}$/
  
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: 'Please enter a valid phone number (7-15 digits)' }
  }
  
  // Additional check for Indian numbers (10 digits starting with 6-9)
  const cleanDigits = cleanPhone.replace(/^\+?91/, '')
  if (cleanDigits.length === 10) {
    const indianRegex = /^[6-9]\d{9}$/
    if (!indianRegex.test(cleanDigits)) {
      return { valid: false, error: 'Indian numbers must start with 6, 7, 8, or 9' }
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// PIN CODE VALIDATION (Indian - 6 digits)
// ============================================
export function validatePinCode(pinCode, required = true) {
  if (!pinCode || !pinCode.toString().trim()) {
    if (required) {
      return { valid: false, error: 'Pin code is required' }
    }
    return { valid: true, error: null }
  }
  
  const cleanPinCode = pinCode.toString().trim().replace(/\D/g, '')
  
  // Indian pin codes: 6 digits, first digit 1-9
  const pinCodeRegex = /^[1-9][0-9]{5}$/
  
  if (!pinCodeRegex.test(cleanPinCode)) {
    return { valid: false, error: 'Please enter a valid 6-digit pin code' }
  }
  
  return { valid: true, error: null }
}

// ============================================
// PASSWORD VALIDATION (Strict)
// At least 8 chars, 1 uppercase, 1 number
// ============================================
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireNumber = true,
    requireSpecialChar = false
  } = options
  
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }
  
  const errors = []
  
  if (password.length < minLength) {
    errors.push(`at least ${minLength} characters`)
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('one uppercase letter')
  }
  
  if (requireNumber && !/\d/.test(password)) {
    errors.push('one number')
  }
  
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('one special character')
  }
  
  if (errors.length > 0) {
    return { 
      valid: false, 
      error: `Password must contain ${errors.join(', ')}` 
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// GST NUMBER VALIDATION (Indian)
// Format: 27AAPFU0939F1ZV (15 characters)
// ============================================
export function validateGST(gst, required = true) {
  if (!gst || !gst.trim()) {
    if (required) {
      return { valid: false, error: 'GST number is required for billing' }
    }
    return { valid: true, error: null }
  }
  
  const cleanGST = gst.trim().toUpperCase()
  
  // GST Format: 2 digits state code + 10 char PAN + 1 entity number + Z + 1 checksum
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  
  if (!gstRegex.test(cleanGST)) {
    return { 
      valid: false, 
      error: 'Invalid GST format. Example: 27AAPFU0939F1ZV' 
    }
  }
  
  // Validate state code (01-37)
  const stateCode = parseInt(cleanGST.substring(0, 2))
  if (stateCode < 1 || stateCode > 37) {
    return { valid: false, error: 'Invalid state code in GST number' }
  }
  
  return { valid: true, error: null }
}

// ============================================
// PAN NUMBER VALIDATION (Indian)
// Format: ABCDE1234F (10 characters)
// ============================================
export function validatePAN(pan, required = false) {
  if (!pan || !pan.trim()) {
    if (required) {
      return { valid: false, error: 'PAN number is required' }
    }
    return { valid: true, error: null }
  }
  
  const cleanPAN = pan.trim().toUpperCase()
  
  // PAN Format: 5 letters + 4 digits + 1 letter
  const panRegex = /^[A-Z]{3}[ABCFGHLJPTK][A-Z][0-9]{4}[A-Z]$/
  
  if (!panRegex.test(cleanPAN)) {
    return { 
      valid: false, 
      error: 'Invalid PAN format. Example: ABCDE1234F' 
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// ADDRESS VALIDATION
// ============================================
export function validateAddress(address, options = {}) {
  const { required = true, minLength = 10 } = options
  
  if (!address || !address.trim()) {
    if (required) {
      return { valid: false, error: 'Address is required' }
    }
    return { valid: true, error: null }
  }
  
  if (address.trim().length < minLength) {
    return { 
      valid: false, 
      error: `Address must be at least ${minLength} characters` 
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// NAME VALIDATION
// ============================================
export function validateName(name, options = {}) {
  const { required = true, minLength = 2, fieldName = 'Name' } = options
  
  if (!name || !name.trim()) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true, error: null }
  }
  
  if (name.trim().length < minLength) {
    return { 
      valid: false, 
      error: `${fieldName} must be at least ${minLength} characters` 
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// REQUIRED FIELD VALIDATION
// ============================================
export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined || 
      (typeof value === 'string' && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)) {
    return { valid: false, error: `${fieldName} is required` }
  }
  return { valid: true, error: null }
}

// Legacy support - check multiple fields
export function validateRequiredFields(obj, fields) {
  const missing = fields.filter(field => !obj[field] || 
    (typeof obj[field] === 'string' && !obj[field].trim()))
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` }
  }
  return { valid: true }
}

// ============================================
// NUMBER VALIDATION
// ============================================
export function validateNumber(value, options = {}) {
  const { 
    required = true, 
    min, 
    max, 
    fieldName = 'Value',
    allowDecimal = true 
  } = options
  
  if (value === null || value === undefined || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true, error: null }
  }
  
  const num = allowDecimal ? parseFloat(value) : parseInt(value)
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` }
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` }
  }
  
  return { valid: true, error: null }
}

// ============================================
// URL VALIDATION
// ============================================
export function validateURL(url, required = false) {
  if (!url || !url.trim()) {
    if (required) {
      return { valid: false, error: 'URL is required' }
    }
    return { valid: true, error: null }
  }
  
  try {
    new URL(url.trim())
    return { valid: true, error: null }
  } catch {
    return { valid: false, error: 'Please enter a valid URL' }
  }
}

// ============================================
// DATE VALIDATION
// ============================================
export function validateDate(date, options = {}) {
  const { required = true, minDate, maxDate, fieldName = 'Date' } = options
  
  if (!date) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true, error: null }
  }
  
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` }
  }
  
  if (minDate && dateObj < new Date(minDate)) {
    return { 
      valid: false, 
      error: `${fieldName} cannot be before ${new Date(minDate).toLocaleDateString()}` 
    }
  }
  
  if (maxDate && dateObj > new Date(maxDate)) {
    return { 
      valid: false, 
      error: `${fieldName} cannot be after ${new Date(maxDate).toLocaleDateString()}` 
    }
  }
  
  return { valid: true, error: null }
}

// ============================================
// FORM VALIDATION HELPER
// ============================================
export function validateForm(validations) {
  const errors = {}
  let isValid = true
  
  for (const [fieldName, validation] of Object.entries(validations)) {
    if (!validation.valid) {
      errors[fieldName] = validation.error
      isValid = false
    }
  }
  
  return { isValid, errors }
}

// ============================================
// INPUT SANITIZATION
// ============================================
export function sanitizeInput(value, type = 'text') {
  if (value === null || value === undefined) return ''
  
  let sanitized = String(value).trim()
  
  switch (type) {
    case 'email':
      return sanitized.toLowerCase()
    case 'phone':
      return sanitized.replace(/[^\d+\-\s()]/g, '')
    case 'number':
      return sanitized.replace(/[^\d.-]/g, '')
    case 'alphanumeric':
      return sanitized.replace(/[^a-zA-Z0-9]/g, '')
    case 'gst':
    case 'pan':
      return sanitized.toUpperCase().replace(/[^A-Z0-9]/g, '')
    case 'pincode':
      return sanitized.replace(/\D/g, '').slice(0, 6)
    default:
      return sanitized
  }
}

// ============================================
// FORMAT HELPERS
// ============================================
export function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  
  // Indian format: +91 XXXXX XXXXX
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  
  // With country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  
  return phone
}

export function formatGST(gst) {
  if (!gst) return ''
  return gst.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
}

export function formatPAN(pan) {
  if (!pan) return ''
  return pan.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
}

// ============================================
// LEGACY VALIDATION FUNCTIONS (for backward compatibility)
// ============================================
export function validateLeadData(data) {
  const errors = {}
  
  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required'
  }
  
  if (data.email) {
    const emailResult = validateEmail(data.email, false)
    if (!emailResult.valid) errors.email = emailResult.error
  }
  
  if (data.phone) {
    const phoneResult = validatePhone(data.phone, false)
    if (!phoneResult.valid) errors.phone = phoneResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateProjectData(data) {
  const errors = {}
  
  if (!data.name || !data.name.trim()) {
    errors.name = 'Project name is required'
  }
  
  if (data.budget !== undefined && data.budget !== '' && data.budget < 0) {
    errors.budget = 'Budget cannot be negative'
  }
  
  if (data.clientEmail) {
    const emailResult = validateEmail(data.clientEmail, false)
    if (!emailResult.valid) errors.clientEmail = emailResult.error
  }
  
  if (data.clientPhone) {
    const phoneResult = validatePhone(data.clientPhone, false)
    if (!phoneResult.valid) errors.clientPhone = phoneResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateTaskData(data) {
  const errors = {}
  
  if (!data.title || !data.title.trim()) {
    errors.title = 'Task title is required'
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateExpenseData(data) {
  const errors = {}
  
  if (!data.description || !data.description.trim()) {
    errors.description = 'Description is required'
  }
  
  if (data.amount === undefined || data.amount === '' || data.amount === null) {
    errors.amount = 'Amount is required'
  } else if (data.amount < 0) {
    errors.amount = 'Amount cannot be negative'
  }
  
  if (!data.category) {
    errors.category = 'Category is required'
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateUserData(data, isUpdate = false) {
  const errors = {}
  
  if (!isUpdate) {
    if (!data.email || !data.email.trim()) {
      errors.email = 'Email is required'
    }
    if (!data.password) {
      errors.password = 'Password is required'
    }
    if (!data.name || !data.name.trim()) {
      errors.name = 'Name is required'
    }
  }
  
  if (data.email) {
    const emailResult = validateEmail(data.email, !isUpdate)
    if (!emailResult.valid) errors.email = emailResult.error
  }
  
  if (data.password) {
    const passwordResult = validatePassword(data.password)
    if (!passwordResult.valid) errors.password = passwordResult.error
  }
  
  if (data.phone) {
    const phoneResult = validatePhone(data.phone, false)
    if (!phoneResult.valid) errors.phone = phoneResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateContactData(data) {
  const errors = {}
  
  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required'
  }
  
  if (data.email) {
    const emailResult = validateEmail(data.email, false)
    if (!emailResult.valid) errors.email = emailResult.error
  }
  
  if (data.phone) {
    const phoneResult = validatePhone(data.phone, false)
    if (!phoneResult.valid) errors.phone = phoneResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateCompanyData(data) {
  const errors = {}
  
  if (!data.name || !data.name.trim()) {
    errors.name = 'Company name is required'
  }
  
  if (data.email) {
    const emailResult = validateEmail(data.email, false)
    if (!emailResult.valid) errors.email = emailResult.error
  }
  
  if (data.phone) {
    const phoneResult = validatePhone(data.phone, false)
    if (!phoneResult.valid) errors.phone = phoneResult.error
  }
  
  if (data.gst) {
    const gstResult = validateGST(data.gst, false)
    if (!gstResult.valid) errors.gst = gstResult.error
  }
  
  if (data.pincode) {
    const pincodeResult = validatePinCode(data.pincode, false)
    if (!pincodeResult.valid) errors.pincode = pincodeResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateSurveyData(data) {
  const errors = {}
  
  if (!data.siteName || !data.siteName.trim()) {
    errors.siteName = 'Site name is required'
  }
  
  if (!data.contactPerson || !data.contactPerson.trim()) {
    errors.contactPerson = 'Contact person is required'
  }
  
  if (!data.contactPhone) {
    errors.contactPhone = 'Contact phone is required'
  } else {
    const phoneResult = validatePhone(data.contactPhone, true)
    if (!phoneResult.valid) errors.contactPhone = phoneResult.error
  }
  
  if (data.contactEmail) {
    const emailResult = validateEmail(data.contactEmail, false)
    if (!emailResult.valid) errors.contactEmail = emailResult.error
  }
  
  if (!data.surveyorName || !data.surveyorName.trim()) {
    errors.surveyorName = 'Surveyor name is required'
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateQuoteData(data) {
  const errors = {}
  
  if (!data.customerName || !data.customerName.trim()) {
    errors.customerName = 'Customer name is required'
  }
  
  if (!data.customerPhone) {
    errors.customerPhone = 'Customer phone is required'
  } else {
    const phoneResult = validatePhone(data.customerPhone, true)
    if (!phoneResult.valid) errors.customerPhone = phoneResult.error
  }
  
  if (data.customerEmail) {
    const emailResult = validateEmail(data.customerEmail, false)
    if (!emailResult.valid) errors.customerEmail = emailResult.error
  }
  
  if (data.gst) {
    const gstResult = validateGST(data.gst, false)
    if (!gstResult.valid) errors.gst = gstResult.error
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

export function validateLoginCredentials(data) {
  const errors = {}
  
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required'
  } else {
    const emailResult = validateEmail(data.email, true)
    if (!emailResult.valid) errors.email = emailResult.error
  }
  
  if (!data.password) {
    errors.password = 'Password is required'
  }
  
  return { 
    valid: Object.keys(errors).length === 0, 
    errors,
    message: Object.values(errors)[0] || null
  }
}

// Export all validators as a single object
export const validators = {
  email: validateEmail,
  phone: validatePhone,
  pinCode: validatePinCode,
  password: validatePassword,
  gst: validateGST,
  pan: validatePAN,
  address: validateAddress,
  name: validateName,
  required: validateRequired,
  number: validateNumber,
  url: validateURL,
  date: validateDate
}

export default validators
