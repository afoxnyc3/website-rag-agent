import { chromium } from 'playwright';

async function testRAG() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('2. Switching to Advanced mode...');
    const advancedButton = page.getByRole('button', { name: /Simple|Advanced/i });
    const buttonText = await advancedButton.textContent();
    if (buttonText?.includes('Simple')) {
      await advancedButton.click();
      console.log('   Switched to Advanced mode');
    }

    console.log('3. Scraping Playwright docs...');
    const urlInput = page.getByPlaceholder('Enter URL to add to knowledge base...');
    await urlInput.fill('https://playwright.dev');

    // Wait a moment for auto-detection
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Crawl|Add to KB/i }).click();

    console.log('4. Waiting for scraping to complete...');
    // Wait for success message
    await page.waitForSelector('text=/Successfully/i', { timeout: 30000 });
    const successMsg = await page.locator('text=/Successfully/i').last().textContent();
    console.log('   Success:', successMsg);

    // Wait a bit for indexing
    await page.waitForTimeout(2000);

    console.log('5. Checking Knowledge Base...');
    await page.getByRole('button', { name: /View KB/i }).click();
    await page.waitForTimeout(1000);

    const kbContent = await page
      .locator('text=/Knowledge Base Manager/i')
      .locator('..')
      .textContent();
    const docBadge = await page.locator('text=/documents/i').first().textContent();
    console.log('   KB shows:', docBadge);

    // Close KB viewer
    await page.locator('button:has-text("✕")').first().click();
    await page.waitForTimeout(500);

    console.log('6. Asking about Playwright...');
    const chatInput = page.getByPlaceholder(
      'Ask about our RAG system, embeddings, or architecture...'
    );
    await chatInput.fill('What is Playwright?');
    await chatInput.press('Enter');

    console.log('7. Waiting for response...');
    await page.waitForSelector('text=/Confidence:/i', { timeout: 15000 });

    // Get the latest assistant response - look for message content
    await page.waitForTimeout(1000); // Wait for response to fully render
    const responseElements = await page.locator('.group.is-assistant').all();
    const lastResponse = responseElements[responseElements.length - 1];
    const responseText = await lastResponse.textContent();

    console.log('8. Response analysis:');
    console.log('   Contains "don\'t have enough":', responseText.includes("don't have enough"));

    // Get confidence score
    const confidenceBadge = await page.locator('text=/Confidence:/i').last().textContent();
    console.log('   Confidence:', confidenceBadge);

    if (responseText.includes("don't have enough")) {
      console.log('❌ FAILED: RAG not retrieving information properly');
      console.log('   Response:', responseText.substring(0, 200));
    } else {
      console.log('✅ SUCCESS: RAG is working correctly');
      console.log('   Response preview:', responseText.substring(0, 200));
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await page.waitForTimeout(3000); // Keep open to see results
    await browser.close();
  }
}

testRAG();
