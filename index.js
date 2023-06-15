const fs = require("fs");
const puppeteer = require("puppeteer-core");
const linksData = fs.readFileSync("linksBAT.json", "utf-8");
const linksArray = JSON.parse(linksData);


//@notes for Jacoub
// 1. linkData is dumpy data with only 4 urls to individual auctions
// 2. the "Show More" button is not a <button> but an <a> tag 
// 3. when all comments are loaded, the style attribute of the <a> tag becomes display: "none" 
// 4. unresolved error: ReferenceError: commentsData is not defined 

//create a function to check if the "Show More" element is on the DOM, hidden or not
const checkIsElementOnDOM = async (page) => {
  let isOnDOM = true;
  await page
    .waitForFunction(
      'document.querySelector("#comments-load-button") !== null',
      { timeout: 1000 }
    )
    .catch(() => {
      isOnDOM = false;
    });
  return isOnDOM;
};


async function run() {
  let browser;
  const allCommentsData = []; // Parent array to store comments data for each page
  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/local/bin/chrome",
    });

    for (let i = 0; i < linksArray.length; i++) {
      const url = linksArray[i];
      const page = await browser.newPage();
      await page.goto(url);

      let retryCount = 0;
      const maxRetries = 3;
      
      let auctionPageData = {
        AuctionName: "",
        AuctionUrl: url,
        comments: [],
      };

      while (retryCount < maxRetries) {
        try {
          //check if the Show More <a> tag is on the DOM tree
          const isElementOnDom = await checkIsElementOnDOM(page);
          console.log(`Show More <a> is on the DOM tree: ${isElementOnDom}`);

          //if the button is on the DOM then select it 
          if (isElementOnDom) {
            let showMoreButton = await page.$("#comments-load-button");
            let loopCount = 0;

            while (showMoreButton) {
              //click the button to load more comments
              await page.evaluate((button) => button.click(), showMoreButton);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log(`Show Button is clicked ${loopCount} times`);
              loopCount += 1;

              // Check to see if the Show More <a> tag has changed to "display: none;"
              const isHidden = await page.evaluate((button) => {
                const style = window.getComputedStyle(button);
                return style.display === "none";
              }, showMoreButton);

              if (isHidden) {
                console.log("No more comments to load");
                break;
              }
            }
          }

          let commentsData = []
            await page.evaluate(() => {
              const commentElements = document.querySelectorAll(".comment.comment-data.group");

              commentElements.forEach((element) => {
                const commentData = {};
              
                const childElements = element.querySelectorAll("div, p, span");
                childElements.forEach((childElement) => {
                  const className = childElement.className;
                  const innerText = childElement.innerText;

                  if (className === "comment-datetime") {
                    commentData.dateTime = innerText;
                  } else if (
                    childElement.hasAttribute("data-bind") &&
                    childElement.getAttribute("data-bind") ===
                      "text: authorName"
                  ) {
                    const authorEl = childElement;
                    commentData.username = authorEl.innerText;
                  } else if (
                    childElement.hasAttribute("data-bind") &&
                    childElement.getAttribute("data-bind") ===
                      "text: authorLikesFormatted"
                  ) {
                    const likesEl = childElement;
                    commentData.likes = likesEl.innerText;
                  } else if (className === "comment-text-markup") {
                    commentData.comment = innerText;
                  } else if (
                    childElement.hasAttribute("data-bind") &&
                    childElement.getAttribute("data-bind") === "html: markup"
                  ) {
                    const BidEl = childElement;
                    commentData.bidPrice = BidEl.innerText;
                  }
  
                })
                  console.log(commentData)
                  commentsData.push(commentData);
                });
                return commentsData; 
              });
          
          auctionPageData.comments = commentsData;
          allCommentsData.push(auctionPageData);

        } catch (error) {
          console.error(`Page error: ${error}`);
          retryCount++;
        }
      }

      if (retryCount === maxRetries) {
        console.error(`Max retries reached. Skipping page.`);
        continue; // Skip the current page and proceed to the next iteration
      }
      const data = JSON.stringify(allCommentsData, null, 2);

      try {
        await fs.promises.writeFile("comments.json", data);
        console.log("Data saved to comments.json file.");
      } catch (error) {
        console.error("Error writing file:", error);
      }
    }
  } catch (e) {
    console.error("run failed", e);
  } finally {
    await browser?.close();
  }
}

if (require.main == module) run();
