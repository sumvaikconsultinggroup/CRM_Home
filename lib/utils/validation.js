export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone) {
  const phoneRegex = /^[+]?[0-9\s-]{10,15}$/
  return phoneRegex.test(phone)
}

export function validateRequired(obj, fields) {
  const missing = fields.filter(field => !obj[field])
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` }
  }
  return { valid: true }
}

export function validateLeadData(data) {
  const required = validateRequired(data, ['name'])
  if (!required.valid) return required
  
  if (data.email && !validateEmail(data.email)) {
    return { valid: false, message: 'Invalid email format' }
  }
  
  return { valid: true }
}

export function validateProjectData(data) {
  const required = validateRequired(data, ['name'])
  if (!required.valid) return required
  
  if (data.budget && data.budget < 0) {
    return { valid: false, message: 'Budget cannot be negative' }
  }
  
  return { valid: true }
}

export function validateTaskData(data) {
  return validateRequired(data, ['title'])
}

export function validateExpenseData(data) {
  const required = validateRequired(data, ['description', 'amount', 'category'])
  if (!required.valid) return required
  
  if (data.amount < 0) {
    return { valid: false, message: 'Amount cannot be negative' }
  }
  
  return { valid: true }
}

export function validateUserData(data, isUpdate = false) {
  if (!isUpdate) {
    const required = validateRequired(data, ['email', 'password', 'name'])
    if (!required.valid) return required
  }
  
  if (data.email && !validateEmail(data.email)) {
    return { valid: false, message: 'Invalid email format' }
  }
  
  return { valid: true }
}
