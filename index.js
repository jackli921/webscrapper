const puppeteer = require("puppeteer");

async function run() {
  let browser;
  let products;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint:
       "ws://localhost:9222/devtools/browser/9efcd9de-d9ca-44d2-bdbb-d928acdf41d8",
      browserExecutablePath: "/usr/local/bin/chrome",
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 6 * 1000);
    await page.goto("https://bringatrailer.com/models/");

    products = await page.evaluate(() => {
      const productElements = document.querySelectorAll(
        ".previous-listing-image-link"
      );

      const products = [];
      for (let i = 0; i < productElements.length; i++) {
        const productNameElement = productElements[i].querySelector(
          ".typography-body1.font-medium"
        );
        const productPriceElement = productElements[i].querySelector(
          ".text-green-600 span"
        );

        const productName = productNameElement
          ? productNameElement.innerText.trim()
          : "";
        const productPrice = productPriceElement
          ? productPriceElement.innerText.trim()
          : "";

        products.push({ name: productName, price: productPrice });
      }

      return products;
    });
  } catch (e) {
    console.log("Scrape failed", e);
  } finally {
    console.log(products);
    await browser?.close();
  }
}

run();
