'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * ValidatedInput - Input component with built-in validation display
 * Shows error messages and visual feedback for validation state
 */
const ValidatedInput = React.forwardRef(({
  label,
  error,
  touched,
  showSuccess,
  className,
  inputClassName,
  required,
  helpText,
  id,
  ...props
}, ref) => {
  const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = touched && error
  const isValid = touched && !error && showSuccess && props.value

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label 
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            'pr-10',
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/50',
            isValid && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            inputClassName
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
        
        {/* Status Icon */}
        {(hasError || isValid) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p 
          id={`${inputId}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {/* Help Text (only show when no error) */}
      {helpText && !hasError && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  )
})

ValidatedInput.displayName = 'ValidatedInput'

/**
 * ValidatedTextarea - Textarea component with validation
 */
const ValidatedTextarea = React.forwardRef(({
  label,
  error,
  touched,
  showSuccess,
  className,
  textareaClassName,
  required,
  helpText,
  id,
  rows = 3,
  ...props
}, ref) => {
  const textareaId = id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const hasError = touched && error
  const isValid = touched && !error && showSuccess && props.value

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label 
          htmlFor={textareaId}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/50',
            isValid && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            textareaClassName
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${textareaId}-error` : undefined}
          {...props}
        />
      </div>

      {/* Error Message */}
      {hasError && (
        <p 
          id={`${textareaId}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {/* Help Text */}
      {helpText && !hasError && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  )
})

ValidatedTextarea.displayName = 'ValidatedTextarea'

/**
 * FormFieldError - Standalone error message component
 */
function FormFieldError({ error, id }) {
  if (!error) return null

  return (
    <p 
      id={id}
      className="text-sm text-red-600 flex items-center gap-1 mt-1"
      role="alert"
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {error}
    </p>
  )
}

/**
 * PasswordStrengthIndicator - Shows password strength visually
 */
function PasswordStrengthIndicator({ password }) {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' }
    if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-yellow-500' }
    if (score <= 5) return { score: 3, label: 'Good', color: 'bg-blue-500' }
    return { score: 4, label: 'Strong', color: 'bg-green-500' }
  }

  const strength = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              level <= strength.score ? strength.color : 'bg-slate-200'
            )}
          />
        ))}
      </div>
      <p className={cn(
        'text-xs',
        strength.score <= 1 ? 'text-red-600' :
        strength.score <= 2 ? 'text-yellow-600' :
        strength.score <= 3 ? 'text-blue-600' : 'text-green-600'
      )}>
        Password strength: {strength.label}
      </p>
    </div>
  )
}

/**
 * ValidationSummary - Shows all validation errors in a summary box
 */
function ValidationSummary({ errors, title = 'Please fix the following errors:' }) {
  const errorList = Object.entries(errors).filter(([_, error]) => error)

  if (errorList.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-red-800">{title}</h4>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errorList.map(([field, error]) => (
              <li key={field}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export {
  ValidatedInput,
  ValidatedTextarea,
  FormFieldError,
  PasswordStrengthIndicator,
  ValidationSummary
}
