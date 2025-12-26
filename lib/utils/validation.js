/**
 * Input Validation Utilities
 */

/**
 * Validate required fields
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email) return { valid: false, message: 'Email is required' }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' }
  }
  
  return { valid: true }
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhone(phone) {
  if (!phone) return { valid: true } // Phone is often optional
  
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '')
  
  // Indian phone number patterns
  const patterns = [
    /^\+91\d{10}$/, // +91XXXXXXXXXX
    /^91\d{10}$/, // 91XXXXXXXXXX
    /^\d{10}$/, // XXXXXXXXXX
    /^0\d{10}$/ // 0XXXXXXXXXX
  ]
  
  if (!patterns.some(p => p.test(cleaned))) {
    return { valid: false, message: 'Invalid phone number format' }
  }
  
  return { valid: true }
}

/**
 * Validate UUID format
 */
export function validateUUID(id) {
  if (!id) return { valid: false, message: 'ID is required' }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return { valid: false, message: 'Invalid UUID format' }
  }
  
  return { valid: true }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value, fieldName = 'Value') {
  if (value === undefined || value === null) {
    return { valid: false, message: `${fieldName} is required` }
  }
  
  const num = Number(value)
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} must be a number` }
  }
  
  if (num < 0) {
    return { valid: false, message: `${fieldName} must be positive` }
  }
  
  return { valid: true }
}

/**
 * Validate date
 */
export function validateDate(date, fieldName = 'Date') {
  if (!date) return { valid: true } // Often optional
  
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) {
    return { valid: false, message: `${fieldName} is not a valid date` }
  }
  
  return { valid: true }
}

/**
 * Validate enum value
 */
export function validateEnum(value, allowedValues, fieldName = 'Value') {
  if (!value) return { valid: true } // Often optional
  
  if (!allowedValues.includes(value)) {
    return { 
      valid: false, 
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
    }
  }
  
  return { valid: true }
}

/**
 * Validate array
 */
export function validateArray(arr, fieldName = 'Array', minLength = 0) {
  if (!Array.isArray(arr)) {
    return { valid: false, message: `${fieldName} must be an array` }
  }
  
  if (arr.length < minLength) {
    return { valid: false, message: `${fieldName} must have at least ${minLength} items` }
  }
  
  return { valid: true }
}

/**
 * Validate name
 */
export function validateName(name) {
  if (!name) return { valid: false, message: 'Name is required' }
  
  if (typeof name !== 'string' || name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' }
  }
  
  return { valid: true }
}

/**
 * Validate address
 */
export function validateAddress(address) {
  if (!address) return { valid: true } // Often optional
  
  if (typeof address !== 'string' || address.trim().length < 10) {
    return { valid: false, message: 'Address must be at least 10 characters' }
  }
  
  return { valid: true }
}

/**
 * Validate PIN code (Indian format)
 */
export function validatePinCode(pinCode) {
  if (!pinCode) return { valid: true } // Often optional
  
  const cleaned = String(pinCode).replace(/\s/g, '')
  
  // Indian PIN code is 6 digits
  if (!/^\d{6}$/.test(cleaned)) {
    return { valid: false, message: 'PIN code must be 6 digits' }
  }
  
  return { valid: true }
}

/**
 * Validate password
 */
export function validatePassword(password) {
  if (!password) return { valid: false, message: 'Password is required' }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  
  return { valid: true }
}

/**
 * Validate task data
 */
export function validateTaskData(data) {
  const errors = []
  
  if (!data.title || data.title.trim().length < 1) {
    errors.push({ field: 'title', message: 'Title is required' })
  }
  
  const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'completed', 'cancelled']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` })
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent']
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${validPriorities.join(', ')}` })
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate user data
 */
export function validateUserData(data) {
  const errors = []
  
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else {
    const emailResult = validateEmail(data.email)
    if (!emailResult.valid) {
      errors.push({ field: 'email', message: emailResult.message })
    }
  }
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  
  if (data.password) {
    const passResult = validatePassword(data.password)
    if (!passResult.valid) {
      errors.push({ field: 'password', message: passResult.message })
    }
  }
  
  // CRM roles - these map to module roles via RBAC middleware
  // client_admin/admin get full permissions, others get role-specific permissions
  const validRoles = [
    // System roles
    'super_admin',      // Platform super admin
    'client_admin',     // Organization owner/admin - full access
    'admin',            // Organization administrator - full access
    // CRM roles
    'manager',          // Team manager
    'sales_rep',        // Sales representative
    'sales_manager',    // Sales team manager
    'project_manager',  // Project manager
    'operations_manager', // Operations manager
    'finance_manager',  // Finance manager
    'accountant',       // Accountant
    'executive',        // Executive
    'installer',        // Installation technician
    'surveyor',         // Site surveyor
    'warehouse',        // Warehouse staff
    'viewer',           // Read-only access
    'user'              // Basic user
  ]
  if (data.role && !validRoles.includes(data.role)) {
    errors.push({ field: 'role', message: `Role must be one of: ${validRoles.join(', ')}` })
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate lead data
 */
export function validateLeadData(data) {
  const errors = []
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  
  // Must have email or phone
  if (!data.email && !data.phone) {
    errors.push({ field: 'contact', message: 'Email or phone is required' })
  }
  
  if (data.email) {
    const emailResult = validateEmail(data.email)
    if (!emailResult.valid) {
      errors.push({ field: 'email', message: emailResult.message })
    }
  }
  
  if (data.phone) {
    const phoneResult = validatePhone(data.phone)
    if (!phoneResult.valid) {
      errors.push({ field: 'phone', message: phoneResult.message })
    }
  }
  
  const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` })
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate expense data
 */
export function validateExpenseData(data) {
  const errors = []
  
  if (!data.description || data.description.trim().length < 2) {
    errors.push({ field: 'description', message: 'Description is required' })
  }
  
  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' })
  } else {
    const amountResult = validatePositiveNumber(data.amount, 'Amount')
    if (!amountResult.valid) {
      errors.push({ field: 'amount', message: amountResult.message })
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Sanitize string input
 */
export function sanitizeString(str) {
  if (!str) return ''
  return String(str).trim()
}

/**
 * Sanitize HTML (basic XSS prevention)
 */
export function sanitizeHTML(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Validate invoice line items
 */
export function validateLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, message: 'At least one line item is required' }
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    if (!item.description && !item.productName && !item.name) {
      return { valid: false, message: `Line item ${i + 1} missing description` }
    }
    
    const quantity = Number(item.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      return { valid: false, message: `Line item ${i + 1} has invalid quantity` }
    }
    
    const rate = Number(item.rate || item.unitPrice || item.price)
    if (isNaN(rate) || rate < 0) {
      return { valid: false, message: `Line item ${i + 1} has invalid rate` }
    }
  }
  
  return { valid: true }
}

/**
 * Composite validator
 */
export function validate(data, schema) {
  const errors = []
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    
    for (const rule of rules) {
      let result
      
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            result = { valid: false, message: rule.message || `${field} is required` }
          } else {
            result = { valid: true }
          }
          break
          
        case 'email':
          result = validateEmail(value)
          break
          
        case 'phone':
          result = validatePhone(value)
          break
          
        case 'uuid':
          result = validateUUID(value)
          break
          
        case 'positive':
          result = validatePositiveNumber(value, field)
          break
          
        case 'date':
          result = validateDate(value, field)
          break
          
        case 'enum':
          result = validateEnum(value, rule.values, field)
          break
          
        case 'array':
          result = validateArray(value, field, rule.minLength)
          break
          
        default:
          result = { valid: true }
      }
      
      if (!result.valid) {
        errors.push({ field, message: result.message })
        break // Stop at first error for this field
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUUID,
  validatePositiveNumber,
  validateDate,
  validateEnum,
  validateArray,
  validateName,
  validateAddress,
  validatePinCode,
  validatePassword,
  validateTaskData,
  validateUserData,
  validateLeadData,
  validateExpenseData,
  sanitizeString,
  sanitizeHTML,
  validateLineItems,
  validate
}
