'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Race Condition Prevention Hook
 * Prevents double-clicks and multiple submissions
 * 
 * Features:
 * - Debouncing (configurable delay)
 * - Loading state management
 * - Automatic re-enable after action completes
 * - Error handling
 * 
 * Usage:
 * const { execute, isLoading } = useSafeAction(myAsyncFunction, { debounce: 300 })
 * <Button onClick={execute} disabled={isLoading}>
 */
export function useSafeAction(action, options = {}) {
  const { 
    debounce = 300,           // Debounce delay in ms
    onSuccess,                // Callback on success
    onError,                  // Callback on error
    resetDelay = 0            // Delay before allowing next action (0 = immediate after completion)
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const lastCallTime = useRef(0)
  const timeoutRef = useRef(null)

  const execute = useCallback(async (...args) => {
    const now = Date.now()
    
    // Debounce check - prevent rapid successive calls
    if (now - lastCallTime.current < debounce) {
      console.log('[SafeAction] Debounced - too soon after last call')
      return
    }

    // Prevent execution if already loading
    if (isLoading) {
      console.log('[SafeAction] Blocked - action already in progress')
      return
    }

    lastCallTime.current = now
    setIsLoading(true)

    try {
      const result = await action(...args)
      onSuccess?.(result)
      return result
    } catch (error) {
      console.error('[SafeAction] Error:', error)
      onError?.(error)
      throw error
    } finally {
      // Reset loading state after optional delay
      if (resetDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsLoading(false)
        }, resetDelay)
      } else {
        setIsLoading(false)
      }
    }
  }, [action, debounce, isLoading, onSuccess, onError, resetDelay])

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return { 
    execute, 
    isLoading, 
    cleanup,
    // Helper to create onClick handler
    createHandler: (handler) => async (...args) => {
      if (isLoading) return
      await execute(handler, ...args)
    }
  }
}

/**
 * Multiple Safe Actions Hook
 * Manages multiple independent button states
 * 
 * Usage:
 * const { getAction, isAnyLoading } = useSafeActions()
 * const saveAction = getAction('save', handleSave)
 * <Button onClick={saveAction.execute} disabled={saveAction.isLoading}>
 */
export function useSafeActions(options = {}) {
  const { debounce = 300 } = options
  const [loadingStates, setLoadingStates] = useState({})
  const lastCallTimes = useRef({})

  const execute = useCallback(async (actionId, action, ...args) => {
    const now = Date.now()
    
    // Debounce check for this specific action
    if (now - (lastCallTimes.current[actionId] || 0) < debounce) {
      console.log(`[SafeActions] Debounced action: ${actionId}`)
      return
    }

    // Check if this specific action is loading
    if (loadingStates[actionId]) {
      console.log(`[SafeActions] Blocked - action ${actionId} in progress`)
      return
    }

    lastCallTimes.current[actionId] = now
    setLoadingStates(prev => ({ ...prev, [actionId]: true }))

    try {
      const result = await action(...args)
      return result
    } catch (error) {
      console.error(`[SafeActions] Error in ${actionId}:`, error)
      throw error
    } finally {
      setLoadingStates(prev => ({ ...prev, [actionId]: false }))
    }
  }, [debounce, loadingStates])

  const getAction = useCallback((actionId, action) => ({
    execute: (...args) => execute(actionId, action, ...args),
    isLoading: !!loadingStates[actionId]
  }), [execute, loadingStates])

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return {
    execute,
    getAction,
    isLoading: (actionId) => !!loadingStates[actionId],
    isAnyLoading,
    loadingStates
  }
}

export default useSafeAction
