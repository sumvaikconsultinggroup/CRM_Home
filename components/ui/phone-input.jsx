'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, ChevronDown, Search } from 'lucide-react'

/**
 * Country codes with flags, dial codes and examples
 */
const COUNTRY_CODES = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX', maxLength: 10 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: 'XXX-XXX-XXXX', maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: 'XXX-XXX-XXXX', maxLength: 10 },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: 'XXX XXXXXXX', maxLength: 11 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: 'X XX XX XX XX', maxLength: 9 },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: 'XX-XXXX-XXXX', maxLength: 10 },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX', maxLength: 11 },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', format: 'XX-XXXX-XXXX', maxLength: 10 },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: 'XX XXXXX-XXXX', maxLength: 11 },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', format: 'XXX XXX-XX-XX', maxLength: 10 },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', format: 'XX-XXX XXXX', maxLength: 9 },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', format: 'XXX-XXX-XXXX', maxLength: 10 },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', format: 'XXX XXXXXXX', maxLength: 10 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', format: 'XXXX-XXXXXX', maxLength: 10 },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', format: 'XXX-XXXXXXX', maxLength: 10 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', format: 'XXXX XXXX', maxLength: 8 },
]

// Sort by name but keep India first
const sortedCountries = [
  COUNTRY_CODES[0], // India first
  ...COUNTRY_CODES.slice(1).sort((a, b) => a.name.localeCompare(b.name))
]

/**
 * PhoneInput - Phone number input with country code selector
 */
const PhoneInput = React.forwardRef(({
  label,
  error,
  touched,
  showSuccess,
  className,
  inputClassName,
  required,
  helpText,
  id,
  value = '',
  onChange,
  onBlur,
  defaultCountry = 'IN',
  disabled,
  placeholder,
  ...props
}, ref) => {
  const inputId = id || props.name || `phone-${Math.random().toString(36).substr(2, 9)}`
  const hasError = touched && error
  const isValid = touched && !error && showSuccess && value

  // Parse initial value to extract country code and number
  const parsePhoneValue = (val) => {
    if (!val) return { countryCode: defaultCountry, phoneNumber: '' }
    
    // Try to match country code from value
    for (const country of COUNTRY_CODES) {
      if (val.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          phoneNumber: val.slice(country.dialCode.length).replace(/\D/g, '')
        }
      }
    }
    
    // If no match, assume it's just digits with default country
    return {
      countryCode: defaultCountry,
      phoneNumber: val.replace(/\D/g, '')
    }
  }

  const [selectedCountry, setSelectedCountry] = React.useState(() => {
    const parsed = parsePhoneValue(value)
    return COUNTRY_CODES.find(c => c.code === parsed.countryCode) || COUNTRY_CODES[0]
  })
  
  const [phoneNumber, setPhoneNumber] = React.useState(() => {
    const parsed = parsePhoneValue(value)
    return parsed.phoneNumber
  })
  
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const dropdownRef = React.useRef(null)
  const inputRef = React.useRef(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter countries based on search
  const filteredCountries = sortedCountries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Update parent when phone changes
  const handlePhoneChange = (newNumber) => {
    // Only allow digits
    const digits = newNumber.replace(/\D/g, '')
    
    // Limit to max length for selected country
    const limitedDigits = digits.slice(0, selectedCountry.maxLength)
    setPhoneNumber(limitedDigits)
    
    // Notify parent with full international format
    if (onChange) {
      const fullNumber = limitedDigits ? `${selectedCountry.dialCode}${limitedDigits}` : ''
      onChange({
        target: {
          name: props.name,
          value: fullNumber
        }
      })
    }
  }

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setDropdownOpen(false)
    setSearchQuery('')
    
    // Update phone number with new country code
    if (onChange && phoneNumber) {
      onChange({
        target: {
          name: props.name,
          value: `${country.dialCode}${phoneNumber.slice(0, country.maxLength)}`
        }
      })
    }
    
    // Focus back on input
    inputRef.current?.focus()
  }

  // Handle blur
  const handleBlur = (e) => {
    if (onBlur) {
      onBlur({
        target: {
          name: props.name,
          value: phoneNumber ? `${selectedCountry.dialCode}${phoneNumber}` : ''
        }
      })
    }
  }

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
      
      <div className="relative flex" ref={dropdownRef}>
        {/* Country Code Selector */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'flex items-center gap-1 px-3 py-2 border rounded-l-md bg-slate-50 hover:bg-slate-100 transition-colors min-w-[100px] justify-between',
            hasError ? 'border-red-500' : 'border-input',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-slate-700">{selectedCountry.dialCode}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Country List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 text-center">No countries found</div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left',
                      selectedCountry.code === country.code && 'bg-blue-50'
                    )}
                  >
                    <span className="text-xl leading-none">{country.flag}</span>
                    <span className="flex-1 text-sm font-medium text-slate-700">{country.name}</span>
                    <span className="text-sm text-slate-500">{country.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <Input
            ref={(node) => {
              inputRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            id={inputId}
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder || selectedCountry.format.replace(/X/g, '0')}
            className={cn(
              'rounded-l-none border-l-0 pr-10',
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

PhoneInput.displayName = 'PhoneInput'

/**
 * Get country by code
 */
export function getCountryByCode(code) {
  return COUNTRY_CODES.find(c => c.code === code) || COUNTRY_CODES[0]
}

/**
 * Get country by dial code
 */
export function getCountryByDialCode(dialCode) {
  return COUNTRY_CODES.find(c => c.dialCode === dialCode) || COUNTRY_CODES[0]
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return ''
  
  // Find matching country
  for (const country of COUNTRY_CODES) {
    if (phone.startsWith(country.dialCode)) {
      const number = phone.slice(country.dialCode.length)
      return `${country.flag} ${country.dialCode} ${number}`
    }
  }
  
  return phone
}

/**
 * Parse phone to components
 */
export function parsePhone(phone) {
  if (!phone) return null
  
  for (const country of COUNTRY_CODES) {
    if (phone.startsWith(country.dialCode)) {
      return {
        country: country,
        dialCode: country.dialCode,
        number: phone.slice(country.dialCode.length)
      }
    }
  }
  
  return {
    country: COUNTRY_CODES[0],
    dialCode: COUNTRY_CODES[0].dialCode,
    number: phone.replace(/\D/g, '')
  }
}

export { PhoneInput, COUNTRY_CODES }
export default PhoneInput
