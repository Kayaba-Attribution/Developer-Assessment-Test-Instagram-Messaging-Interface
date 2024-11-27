const browserService = new BrowserService(config, logger);

const { browser, page, fingerprint } = await browserService.createPage(
  sessionData,
  proxy
);

// Use consistent fingerprint data for the session
console.log('Session fingerprint:', fingerprint);

// Take screenshotsx
await browserService.takeScreenshot(page, 'login_page');

// Clean up
await browser.close();