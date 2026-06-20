import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { SeededUser } from './_fixtures'

/**
 * Drives the welcome → login-dialog → authenticated flow for a seeded user.
 * Lands on the dashboard. Use as the canonical entry point for any E2E that
 * needs an authenticated session — never re-implement the steps inline.
 */
export async function loginAs(page: Page, user: SeededUser) {
  await page.goto('/')
  await page.getByTestId('welcome-hero__login-trigger').click()
  await page.getByTestId('login-dialog__email').locator('input').fill(user.email)
  await page.getByTestId('login-dialog__password').locator('input').fill(user.password)
  await page.getByTestId('login-dialog__submit').click()
  await expect(page.getByTestId('dashboard')).toBeVisible()
}
