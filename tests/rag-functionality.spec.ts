import { test, expect, Page } from '@playwright/test';

test.describe('RAG Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('should scrape a URL and answer questions about it', async () => {
    // Switch to Advanced mode
    const advancedButton = page.getByRole('button', { name: /Simple|Advanced/i });
    const buttonText = await advancedButton.textContent();
    if (buttonText?.includes('Simple')) {
      await advancedButton.click();
    }

    // Enter a test URL (using a simple, fast-loading page)
    const urlInput = page.getByPlaceholder('Enter URL to add to knowledge base...');
    await urlInput.fill('https://example.com');

    // Click the scrape button
    await page.getByRole('button', { name: /Add to KB|Crawl/i }).click();

    // Wait for success message
    await expect(page.getByText(/Successfully/i)).toBeVisible({ timeout: 30000 });

    // Ask a question about the scraped content
    const chatInput = page.getByPlaceholder('Ask about our RAG system, embeddings, or architecture...');
    await chatInput.fill('What is this page about?');
    await chatInput.press('Enter');

    // Wait for response with confidence score
    await expect(page.getByText(/Confidence:/i)).toBeVisible({ timeout: 10000 });

    // Check that we got a meaningful response (not "I don't have enough information")
    const response = await page.locator('.prose').last().textContent();
    expect(response).not.toContain("I don't have enough information");
  });

  test('should show documents in knowledge base viewer', async () => {
    // Switch to Advanced mode if needed
    const advancedButton = page.getByRole('button', { name: /Simple|Advanced/i });
    const buttonText = await advancedButton.textContent();
    if (buttonText?.includes('Simple')) {
      await advancedButton.click();
    }

    // Scrape a URL first
    const urlInput = page.getByPlaceholder('Enter URL to add to knowledge base...');
    await urlInput.fill('https://example.com');
    await page.getByRole('button', { name: /Add to KB|Crawl/i }).click();
    await expect(page.getByText(/Successfully/i)).toBeVisible({ timeout: 30000 });

    // Open Knowledge Base viewer
    await page.getByRole('button', { name: /View KB/i }).click();

    // Check that documents are shown
    await expect(page.getByText('Knowledge Base Manager')).toBeVisible();
    await expect(page.getByText(/documents/i)).toBeVisible();

    // Should show at least 1 document
    const docCount = await page.locator('.badge').filter({ hasText: /documents/i }).textContent();
    expect(docCount).not.toContain('0 documents');
  });

  test('should clear knowledge base', async () => {
    // Open Knowledge Base viewer
    await page.getByRole('button', { name: /View KB/i }).click();

    // Click Clear All button
    await page.getByRole('button', { name: /Clear All/i }).click();

    // Confirm in dialog
    await page.getByRole('button', { name: /Clear All/i }).last().click();

    // Check that knowledge base is empty
    await expect(page.getByText(/Knowledge base is empty/i)).toBeVisible({ timeout: 5000 });
  });
});