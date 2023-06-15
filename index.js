const puppeteer = require("puppeteer-core");
const fs = require("fs");

async function run() {
  let browser;
  let commentsData;
  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/local/bin/chrome",
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 6 * 1000);
    await page.goto("https://bringatrailer.com/listing/2014-fiat-abarth/");

    //checks if the button element is visible or not
    const isElementVisible = async (page) => {
      let visible = true;
      await page
        .waitForFunction(
          'document.querySelector("#comments-load-button") !== null',
          { timeout: 2000 }
        )
        .catch(() => {
          visible = false;
        });
      return visible;
    };

    const isVisible = await isElementVisible(page);
    console.log(`Show More <a> is visible: ${isVisible}`);

    if (isVisible) {
      await page.waitForSelector("#comments-load-button", {
        visible: true,
        timeout: 1000,
      });

      let showMoreButton = await page.$("#comments-load-button");
      let loopCount = 0;
      while (showMoreButton) {
        await page.evaluate((button) => button.click(), showMoreButton);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        showMoreButton = await page.$("#comments-load-button");
        console.log(`Show Button is clicked ${loopCount} times`);
        loopCount +=1

       // Check if the CSS style of the <a> element has changed to "display: none;"
        const isHidden = await page.evaluate((button) => {
          const style = window.getComputedStyle(button);
          return style.display === "none";
        }, showMoreButton);

        if (isHidden) {
          break; // Exit the loop when the button is hidden
        }
      }

      commentsData = await page.evaluate(() => {
        const commentElements = document.querySelectorAll(".comment.comment-data.group");

        const commentsData = [];
        commentElements.forEach((element) => {
          const commentData = {};
          const childElements = element.querySelectorAll("div, p, span");
          childElements.forEach((childElement) => {
            const className = childElement.className;
            const innerText = childElement.innerText;

            if (className === "comment-datetime") {
              commentData.dateTime = innerText;
            } else if (childElement.hasAttribute("data-bind") && childElement.getAttribute("data-bind") === "text: authorName") {
              const authorEl = childElement;
              commentData.username = authorEl.innerText;
            } else if (childElement.hasAttribute("data-bind") && childElement.getAttribute("data-bind") === "text: authorLikesFormatted") {
              const likesEl = childElement;
              commentData.likes = likesEl.innerText;
            } else if (className === "comment-text-markup") {
              commentData.comment = innerText;
            } else if (childElement.hasAttribute("data-bind") && childElement.getAttribute("data-bind") === "html: markup") {
              const BidEl = childElement;
              commentData.bidPrice = BidEl.innerText;
            } 
         
          });

          // Add the commentData object to commentsData array
          commentsData.push(commentData);
        });

        return commentsData;
      });
    }
    
  } catch (e) {
    console.log("Scrape failed", e);
  } finally {
    console.log(commentsData.length);
    await browser?.close();
    if (commentsData && commentsData.length > 0) {
      const data = JSON.stringify(commentsData, null, 2);
      fs.writeFile("comments.json", data, (err) => {
        if (err) {
          console.error("Error writing file:", err);
        } else {
          console.log("Data saved to comments.json file.");
        }
      });
    }
  }
}

run();
