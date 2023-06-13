const puppeteer = require("puppeteer");
const fs = require("fs");

async function run() {
  let browser;
  let models;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint:
      "ws://localhost:9222/devtools/browser/db740f40-cf85-466c-846e-a50608fdfe20",
      browserExecutablePath: "/usr/local/bin/chrome",
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 6 * 1000);
    await page.goto("https://bringatrailer.com/models/");

    models = await page.evaluate(() => {
      const linkElements = document.querySelectorAll(
        ".previous-listing-image-link"
      );

      const models = [];
      linkElements.forEach((element) => {
        const modelElement = element.querySelector(
          ".previous-listing-image-overlay-inner-cell"
        );
        const modelName = modelElement.innerText.trim();
        const url = element.href;
        models.push({ [String(modelName)]: url });
      });

      return models;
    });
  } catch (e) {
    console.log("Scrape failed", e);
  } finally {
    console.log(models);
    await browser?.close();
    if (models.length > 0) {
      const data = JSON.stringify(models, null, 2);
      fs.writeFile("link.js", `const links = ${data};`, (err) => {
        if (err) {
          console.error("Error writing file:", err);
        } else {
          console.log("Data saved to link.js file.");
        }
      });
    }
  }
}

run();
