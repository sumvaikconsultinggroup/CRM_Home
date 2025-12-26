'use client'

import * as React from 'react'
import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SafeButton - Race Condition Protected Button
 * 
 * Automatically prevents:
 * - Double clicks
 * - Multiple submissions
 * - Rapid successive clicks (debouncing)
 * 
 * Features:
 * - Shows loading spinner during action
 * - Disables button while processing
 * - 300ms debounce by default
 * - Preserves all standard Button props
 * 
 * Usage:
 * <SafeButton onClick={async () => await saveData()}>Save</SafeButton>
 * <SafeButton onClick={handleSubmit} debounce={500}>Submit</SafeButton>
 */
const SafeButton = React.forwardRef((
  { 
    children, 
    onClick, 
    disabled,
    debounce = 300,
    showSpinner = true,
    spinnerPosition = 'left',
    loadingText,
    className,
    variant,
    size,
    ...props 
  }, 
  ref
) => {
  const [isLoading, setIsLoading] = useState(false)
  const lastClickTime = useRef(0)
  const isMounted = useRef(true)

  React.useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleClick = useCallback(async (e) => {
    // Prevent default if it's a form submit button
    if (props.type === 'submit') {
      e.preventDefault()
    }

    const now = Date.now()
    
    // Debounce check
    if (now - lastClickTime.current < debounce) {
      console.log('[SafeButton] Click debounced')
      return
    }

    // Prevent if already loading
    if (isLoading) {
      console.log('[SafeButton] Click blocked - already loading')
      return
    }

    // Prevent if disabled
    if (disabled) {
      return
    }

    lastClickTime.current = now
    setIsLoading(true)

    try {
      // Call the onClick handler
      if (onClick) {
        await onClick(e)
      }
    } catch (error) {
      console.error('[SafeButton] Action error:', error)
      // Re-throw to let parent handle the error
      throw error
    } finally {
      // Only update state if component is still mounted
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [onClick, disabled, isLoading, debounce, props.type])

  const isDisabled = disabled || isLoading

  const renderContent = () => {
    if (isLoading && showSpinner) {
      const spinner = <Loader2 className="h-4 w-4 animate-spin" />
      const text = loadingText || children

      if (spinnerPosition === 'left') {
        return (
          <>
            {spinner}
            <span className="ml-2">{text}</span>
          </>
        )
      } else if (spinnerPosition === 'right') {
        return (
          <>
            <span className="mr-2">{text}</span>
            {spinner}
          </>
        )
      } else if (spinnerPosition === 'only') {
        return spinner
      }
    }

    return children
  }

  return (
    <Button
      ref={ref}
      onClick={handleClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={cn(
        isLoading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {renderContent()}
    </Button>
  )
})

SafeButton.displayName = 'SafeButton'

/**
 * SafeIconButton - Icon-only button with race condition protection
 */
const SafeIconButton = React.forwardRef((
  { 
    children, 
    onClick, 
    disabled,
    debounce = 300,
    className,
    ...props 
  }, 
  ref
) => {
  const [isLoading, setIsLoading] = useState(false)
  const lastClickTime = useRef(0)
  const isMounted = useRef(true)

  React.useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleClick = useCallback(async (e) => {
    const now = Date.now()
    
    if (now - lastClickTime.current < debounce) return
    if (isLoading || disabled) return

    lastClickTime.current = now
    setIsLoading(true)

    try {
      if (onClick) await onClick(e)
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [onClick, disabled, isLoading, debounce])

  return (
    <Button
      ref={ref}
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="ghost"
      size="icon"
      className={cn(
        isLoading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </Button>
  )
})

SafeIconButton.displayName = 'SafeIconButton'

/**
 * withSafeClick - HOC to add race condition protection to any component
 * 
 * Usage:
 * const SafeLink = withSafeClick(Link)
 * <SafeLink onClick={handleClick}>Click me</SafeLink>
 */
function withSafeClick(WrappedComponent, options = {}) {
  const { debounce = 300 } = options

  return React.forwardRef((props, ref) => {
    const { onClick, disabled, ...rest } = props
    const [isLoading, setIsLoading] = useState(false)
    const lastClickTime = useRef(0)

    const handleClick = useCallback(async (e) => {
      const now = Date.now()
      if (now - lastClickTime.current < debounce) return
      if (isLoading || disabled) return

      lastClickTime.current = now
      setIsLoading(true)

      try {
        if (onClick) await onClick(e)
      } finally {
        setIsLoading(false)
      }
    }, [onClick, disabled, isLoading])

    return (
      <WrappedComponent
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        {...rest}
      />
    )
  })
}

export { SafeButton, SafeIconButton, withSafeClick }
export default SafeButton
