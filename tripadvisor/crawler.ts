import { writeFileSync } from "fs";
import puppeteer, { Page } from "puppeteer";
import { Lead } from "../types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAILTO_REGEX = /mailto:([^\?]*)/;

const scrapeCityPage = async (page: Page, city: string, start: string) => {
  await page.goto(
    `https://www.tripadvisor.com/Search?q=${city}&ssrc=e&geo=187070&o=${start}`
  );

  await page.waitForSelector(".pageNum");
  const pages = (await page.$$(".pageNum")).length;
  const urls = await page.$$eval(
    ".content-column .result-content-columns",
    (elements) =>
      elements.map((element) =>
        element.getAttribute("onclick")?.split(",")[3].replace(/'/g, "").trim()
      )
  );

  const leads: Lead[] = [];
  for (const url of urls) {
    await page.goto(`https://www.tripadvisor.com${url}`);
    const content = await page.content();
    const email = content.match(MAILTO_REGEX)?.[0].split(":")[1];
    const name = await page.$eval(
      "[data-test-target='top-info-header']",
      (element) => element.textContent
    );
    if (!email || !name) continue;
    leads.push({ name, email, city });
  }

  return { pages, leads };
};

const scrapeCity = async (page: Page, city: string) => {
  const { pages, leads } = await scrapeCityPage(page, city, "0");
  for (let i = 2; i <= pages; i++) {
    const { leads: newLeads } = await scrapeCityPage(
      page,
      city,
      ((i - 1) * 30).toString()
    );
    leads.push(...newLeads);
  }
  return leads;
};

const crawler = async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const leads = await scrapeCity(page, "obernai");
    writeFileSync("leads.json", JSON.stringify(leads, null, 2));
    await page.close();
    await browser.close();
  } catch (error) {
    console.error(error);
  }
};

crawler();
