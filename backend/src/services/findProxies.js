const proxyService = require("./freeProxyService");
const fs = require("fs").promises;

async function findAndSaveWorkingProxies(
  numberOfProxies,
  outputFile = "working-proxies.json"
) {
  const workingProxies = [];
  const maxAttempts = numberOfProxies * 3; // Allow for some failed attempts
  let attempts = 0;

  console.log(`Searching for ${numberOfProxies} working proxies...`);

  try {
    // First fetch new proxies to ensure we have a fresh list
    await proxyService.fetchProxies();

    while (workingProxies.length < numberOfProxies && attempts < maxAttempts) {
      attempts++;

      try {
        const proxy = await proxyService.getProxy();

        // Check if this proxy is already in our list
        const isDuplicate = workingProxies.some(
          (p) => p.server === proxy.server
        );

        if (!isDuplicate) {
          // Verify the proxy one more time to ensure reliability
          const isWorking = await proxyService.verifyProxy(proxy);

          if (isWorking) {
            workingProxies.push({
              server: proxy.server,
              type: proxy.type,
              isKnown: proxy.isKnown || false,
            });

            console.log(
              `Found working proxy ${workingProxies.length}/${numberOfProxies}: ${proxy.server}`
            );
          }
        }
      } catch (error) {
        console.warn(`Attempt ${attempts} failed:`, error.message);
      }
    }

    if (workingProxies.length === 0) {
      throw new Error("No working proxies found");
    }

    // Save to file
    await fs.writeFile(outputFile, JSON.stringify(workingProxies, null, 2));
    console.log(
      `Successfully saved ${workingProxies.length} proxies to ${outputFile}`
    );

    // Display proxy stats
    const stats = proxyService.getProxyStats();
    console.log("\nProxy Statistics:", stats);

    return workingProxies;
  } catch (error) {
    console.error("Error finding working proxies:", error);
    throw error;
  }
}


const numberOfProxiesToFind = 3;

findAndSaveWorkingProxies(numberOfProxiesToFind)
  .then((proxies) => {
    console.log("Found proxies:", proxies);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
