import { test, expect } from '@playwright/test'

test('redirects / to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('applies dark mode by default', async ({ page }) => {
  await page.goto('/login')
  const htmlClass = await page.evaluate(() => document.documentElement.className)
  expect(htmlClass).toContain('dark')
})
