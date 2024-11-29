const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");
const { config, isDev } = require("../config");

// Function to save session data to file (dev only)
async function saveSessionToFile(sessionData) {
  if (isDev) {
    try {
      const sessionFile = path.join(
        __dirname,
        "../../sessions/saved_session.json"
      );
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
      logger.info("Session data saved to file");
    } catch (error) {
      logger.error("Error saving session to file:", error);
    }
  }
}

// Function to load session data from file
async function loadSessionFromFile() {
  try {
    const sessionFile = path.join(
      __dirname,
      "../../sessions/saved_session.json"
    );
    console.log(sessionFile);
    const data = await fs.readFile(sessionFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error("Error loading session from file:", error);
    throw new Error("Failed to load session data");
  }
}

async function takeScreenshot(page, name) {
  if (!config.saveScreenshots) return null;

  const screenshotPath = path.join(
    config.screenshotsDir,
    `${name}_${Date.now()}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (isDev) {
    logger.debug(`Screenshot saved: ${screenshotPath}`);
  }
  return screenshotPath;
}

module.exports = {
  saveSessionToFile,
  loadSessionFromFile,
  takeScreenshot,
};
