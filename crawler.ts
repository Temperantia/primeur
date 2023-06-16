import puppeteer from "puppeteer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const crawler = async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.tripadvisor.com/Search?q=granville");
    await sleep(3000);
    //await page.close();
    //await browser.close();
  } catch (error) {
    console.error(error);
  }
};

crawler();
