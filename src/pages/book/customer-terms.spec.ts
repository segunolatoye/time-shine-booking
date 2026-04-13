import { test, expect } from '@playwright/test';

test.describe('Customer Details - Terms & Conditions', () => {
  test('should require terms and conditions to be accepted', async ({ page }) => {
    // 1. Mock the Supabase call for terms and conditions so we always test this feature reliably
    await page.route('**/rest/v1/settings?select=value&key=eq.terms_and_conditions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { value: { text: "These are the mandatory test terms." } } })
      });
    });

    // 2. Go to the home page and start the booking flow
    await page.goto('/');
    
    // Note: Adjust these selectors based on your actual Index/Staff/DateTime component layouts
    // Click on the first service "Book" button
    await page.getByRole('button', { name: /book/i }).first().click();
    
    // Select "Any Available" staff
    await page.getByText('Any Available').click();
    
    // Pick a date in the calendar (e.g. 15th of the current month)
    await page.locator('.rdp-day:not(.rdp-day_outside)').nth(15).click();
    
    // Pick the first available time slot
    await page.locator('button:has-text("AM"), button:has-text("PM")').first().click();
    
    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click();

    // 3. We should now be on the Customer Details page
    await expect(page.getByRole('heading', { name: 'Your Details' })).toBeVisible();
    
    // Fill in the personal details
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '1234567890');

    // Verify terms are displayed from our mock
    await expect(page.getByText('These are the mandatory test terms.')).toBeVisible();

    // 4. Try to submit WITHOUT checking the terms box
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    
    // Expect the validation error message to appear
    const errorMessage = page.getByText('You must accept the terms and conditions to proceed.');
    await expect(errorMessage).toBeVisible();

    // 5. Check the box and submit again
    // Note: shadcn/ui Checkbox uses a button under the hood with role="checkbox"
    await page.getByRole('checkbox', { name: /I agree to the Terms and Conditions/i }).click();
    
    // The error should disappear immediately
    await expect(errorMessage).toBeHidden();
    
    await page.getByRole('button', { name: 'Continue to Payment' }).click();

    // 6. Successfully navigated to the payment page
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  });
});