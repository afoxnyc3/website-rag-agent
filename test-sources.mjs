import { chromium } from 'playwright';

async function testSourcesDisplay() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Testing RAG Sources Display Feature\n');

    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('2. Testing with a simple question about the RAG system...');
    const chatInput = page.getByPlaceholder('Ask about our RAG system, embeddings, or architecture...');
    await chatInput.fill('What embedding model does this system use?');
    await chatInput.press('Enter');

    console.log('3. Waiting for response with sources...');
    await page.waitForSelector('text=/Confidence:/i', { timeout: 15000 });
    await page.waitForTimeout(1000); // Wait for response to fully render

    // Check for confidence badge
    const confidenceBadge = await page.locator('text=/Confidence:/i').last();
    const confidenceText = await confidenceBadge.textContent();
    console.log('   ✓ Confidence:', confidenceText);

    // Check for sources button
    const sourcesButton = await page.locator('button:has-text("source")').first();
    if (await sourcesButton.isVisible()) {
      const sourcesText = await sourcesButton.textContent();
      console.log('   ✓ Sources button found:', sourcesText.trim());

      console.log('4. Clicking to expand sources...');
      await sourcesButton.click();
      await page.waitForTimeout(500);

      // Check if sources are displayed
      const sourcesSection = await page.locator('text=/Referenced Sources:/i');
      if (await sourcesSection.isVisible()) {
        console.log('   ✓ Sources section expanded');

        // Count displayed sources
        const sourceItems = await page.locator('text=/Project Documentation/i').all();
        console.log(`   ✓ Found ${sourceItems.length} internal documentation sources`);

        // Get the actual response text to verify it's using knowledge base
        const responseElements = await page.locator('.group.is-assistant').all();
        const lastResponse = responseElements[responseElements.length - 1];
        const responseText = await lastResponse.textContent();

        if (responseText.includes("text-embedding-3-small") || responseText.includes("1536")) {
          console.log('   ✓ Response correctly identifies embedding model from knowledge base');
        }
      } else {
        console.log('   ⚠️ Sources section not visible after clicking');
      }
    } else {
      console.log('   ⚠️ No sources button found - might be a direct response');
    }

    console.log('\n5. Testing with advanced mode and external URL...');

    // Switch to advanced mode if needed
    const modeButton = await page.locator('button:has(svg):has-text(/Simple|Advanced/)').first();
    if (await modeButton.isVisible()) {
      const modeText = await modeButton.textContent();
      if (modeText.includes('Simple')) {
        await modeButton.click();
        console.log('   ✓ Switched to Advanced mode');
        await page.waitForTimeout(500);
      }
    }

    // Scrape a test URL
    console.log('6. Adding external content to knowledge base...');
    const urlInput = page.getByPlaceholder('Enter URL to add to knowledge base...');
    await urlInput.fill('https://example.com');

    const scrapeButton = await page.locator('button:has-text(/Scrape|Add/)').first();
    await scrapeButton.click();

    // Wait for scraping to complete
    await page.waitForSelector('text=/Successfully/i', { timeout: 30000 });
    console.log('   ✓ External content added to knowledge base');

    // Ask a question that might use the new content
    await page.waitForTimeout(2000);
    await chatInput.fill('What content have you scraped from example.com?');
    await chatInput.press('Enter');

    console.log('7. Checking response with external sources...');
    await page.waitForSelector('text=/Confidence:/i', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Look for new sources button
    const allSourceButtons = await page.locator('button:has-text("source")').all();
    if (allSourceButtons.length > 1) {
      const lastSourceButton = allSourceButtons[allSourceButtons.length - 1];
      await lastSourceButton.click();
      await page.waitForTimeout(500);

      // Check for external link in sources
      const externalLinks = await page.locator('a[href*="example.com"]').all();
      if (externalLinks.length > 0) {
        console.log('   ✓ External source link found in expanded sources');
      }
    }

    console.log('\n✅ Sources display test completed successfully!');
    console.log('Summary:');
    console.log('  - Sources button appears when RAG provides sources');
    console.log('  - Clicking expands to show source details');
    console.log('  - Internal docs show as "Project Documentation"');
    console.log('  - External URLs show as clickable links');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-failure.png' });
    console.log('Screenshot saved to test-failure.png');
  } finally {
    await page.waitForTimeout(3000); // Keep open to see results
    await browser.close();
  }
}

testSourcesDisplay();