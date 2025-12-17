'use client'

import { useState, useCallback } from 'react'
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validatePinCode,
  validateGST,
  validatePAN,
  validateAddress,
  validateName,
  validateRequired,
  validateNumber
} from '@/lib/utils/validation'

/**
 * Custom hook for form validation
 * Provides real-time validation and error management
 */
export function useValidation(initialErrors = {}) {
  const [errors, setErrors] = useState(initialErrors)
  const [touched, setTouched] = useState({})

  // Clear a specific field error
  const clearError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  // Set a specific field error
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  // Mark field as touched (for showing errors only after interaction)
  const touchField = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  // Check if field has been touched
  const isTouched = useCallback((field) => touched[field] || false, [touched])

  // Get error for a field (only if touched)
  const getError = useCallback((field, showAlways = false) => {
    if (showAlways || touched[field]) {
      return errors[field] || null
    }
    return null
  }, [errors, touched])

  // Validate a single field
  const validateField = useCallback((field, value, validationType, options = {}) => {
    let result = { valid: true, error: null }

    switch (validationType) {
      case 'email':
        result = validateEmail(value, options.required !== false)
        break
      case 'phone':
        result = validatePhone(value, options.required !== false)
        break
      case 'password':
        result = validatePassword(value, options)
        break
      case 'pincode':
        result = validatePinCode(value, options.required !== false)
        break
      case 'gst':
        result = validateGST(value, options.required !== false)
        break
      case 'pan':
        result = validatePAN(value, options.required !== false)
        break
      case 'address':
        result = validateAddress(value, options)
        break
      case 'name':
        result = validateName(value, { ...options, fieldName: options.fieldName || field })
        break
      case 'required':
        result = validateRequired(value, options.fieldName || field)
        break
      case 'number':
        result = validateNumber(value, options)
        break
      default:
        // Custom validation function passed
        if (typeof validationType === 'function') {
          result = validationType(value, options)
        }
    }

    if (result.valid) {
      clearError(field)
    } else {
      setFieldError(field, result.error)
    }

    return result
  }, [clearError, setFieldError])

  // Validate on blur handler
  const handleBlur = useCallback((field, value, validationType, options = {}) => {
    touchField(field)
    return validateField(field, value, validationType, options)
  }, [touchField, validateField])

  // Validate on change handler (optional - for real-time validation)
  const handleChange = useCallback((field, value, validationType, options = {}) => {
    if (touched[field]) {
      return validateField(field, value, validationType, options)
    }
    return { valid: true, error: null }
  }, [touched, validateField])

  // Validate entire form
  const validateAll = useCallback((fields) => {
    const newErrors = {}
    let isValid = true

    for (const [field, config] of Object.entries(fields)) {
      const result = validateField(field, config.value, config.type, config.options)
      if (!result.valid) {
        newErrors[field] = result.error
        isValid = false
      }
      touchField(field)
    }

    setErrors(newErrors)
    return { isValid, errors: newErrors }
  }, [validateField, touchField])

  // Check if form has any errors
  const hasErrors = Object.keys(errors).length > 0

  // Get all current errors
  const getAllErrors = useCallback(() => errors, [errors])

  return {
    errors,
    touched,
    hasErrors,
    setFieldError,
    clearError,
    clearAllErrors,
    validateField,
    handleBlur,
    handleChange,
    validateAll,
    getError,
    isTouched,
    touchField,
    getAllErrors
  }
}

/**
 * Input wrapper component props generator
 * Returns props to spread on input elements for validation
 */
export function useValidatedInput(validation, field, validationType, options = {}) {
  const {
    handleBlur,
    handleChange,
    getError,
    isTouched
  } = validation

  return {
    onBlur: (e) => handleBlur(field, e.target.value, validationType, options),
    onChange: (e) => handleChange(field, e.target.value, validationType, options),
    error: getError(field),
    hasError: !!getError(field),
    touched: isTouched(field),
    'aria-invalid': !!getError(field),
    'aria-describedby': getError(field) ? `${field}-error` : undefined
  }
}

export default useValidation
