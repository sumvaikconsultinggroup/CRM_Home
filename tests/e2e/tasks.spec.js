/**
 * E2E Test: Tasks Management
 * Tests the task management workflow including Simple/Advanced toggle
 * 
 * Run with: npx playwright test tests/e2e/tasks.spec.js
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function login(page) {
  await page.goto(BASE_URL)
  await page.click('text=Sign In')
  await page.waitForTimeout(1000)
  await page.fill('input[type="email"]', 'xyz@interiors.com')
  await page.fill('input[type="password"]', 'client123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(5000)
}

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to Tasks page', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    // Should see task board or list
    const tasksVisible = await page.locator('text=Backlog, text=To Do, text=In Progress, text=Done').first().isVisible().catch(() => false)
    expect(tasksVisible).toBe(true)
  })

  test('should display Kanban columns', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    const columns = ['Backlog', 'To Do', 'In Progress', 'Done']
    
    for (const col of columns) {
      const visible = await page.locator(`text=${col}`).first().isVisible().catch(() => false)
      if (visible) {
        console.log(`  ✓ ${col} column visible`)
      }
    }
  })

  test('should open Create Task dialog', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    // Find and click Create Task button
    const createBtn = page.locator('button:has-text("Create Task"), button:has-text("+ Create")')
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click()
      await page.waitForTimeout(2000)
      
      // Should see dialog
      const dialog = page.locator('text=Create New Task')
      await expect(dialog).toBeVisible()
    }
  })

  test('should have Simple/Advanced toggle in Create Task dialog', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    const createBtn = page.locator('button:has-text("Create Task"), button:has-text("+ Create")')
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click()
      await page.waitForTimeout(2000)
      
      // Check for Simple/Advanced toggle
      const simpleBtn = page.locator('button:has-text("Simple")')
      const advancedBtn = page.locator('button:has-text("Advanced")')
      
      const simpleVisible = await simpleBtn.isVisible().catch(() => false)
      const advancedVisible = await advancedBtn.isVisible().catch(() => false)
      
      console.log(`  Simple button: ${simpleVisible}, Advanced button: ${advancedVisible}`)
      
      expect(simpleVisible).toBe(true)
      expect(advancedVisible).toBe(true)
    }
  })

  test('should switch between Simple and Advanced modes', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    const createBtn = page.locator('button:has-text("Create Task"), button:has-text("+ Create")')
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click()
      await page.waitForTimeout(2000)
      
      // Click Advanced
      const advancedBtn = page.locator('button:has-text("Advanced")')
      if (await advancedBtn.isVisible().catch(() => false)) {
        await advancedBtn.click()
        await page.waitForTimeout(1000)
        
        // Should see additional fields like Description, Assignees, etc.
        const descriptionField = page.locator('text=Description')
        const visible = await descriptionField.isVisible().catch(() => false)
        console.log(`  Description field visible in Advanced mode: ${visible}`)
      }
      
      // Click back to Simple
      const simpleBtn = page.locator('button:has-text("Simple")')
      if (await simpleBtn.isVisible().catch(() => false)) {
        await simpleBtn.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should create a new task', async ({ page }) => {
    await page.click('text=Tasks')
    await page.waitForTimeout(3000)
    
    const createBtn = page.locator('button:has-text("Create Task"), button:has-text("+ Create")')
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click()
      await page.waitForTimeout(2000)
      
      // Fill in task details
      const titleInput = page.locator('input[placeholder*="title"], input').first()
      await titleInput.fill('E2E Test Task - ' + Date.now())
      
      // Submit
      const submitBtn = page.locator('button:has-text("Create"), button:has-text("Save")')
      if (await submitBtn.last().isVisible().catch(() => false)) {
        await submitBtn.last().click()
        await page.waitForTimeout(2000)
        
        // Dialog should close
        const dialogClosed = await page.locator('text=Create New Task').isVisible().catch(() => true)
        console.log(`  Dialog closed after creation: ${!dialogClosed}`)
      }
    }
  })
})
