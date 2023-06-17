import { writeFileSync } from "fs";
import puppeteer, { Page } from "puppeteer";

import cities from "../cities.json";
import { Lead } from "../types";

const MAILTO_REGEX = /mailto:([^\?]*)/;

const scrapeCityPage = async (page: Page, city: string, start: string) => {
  await page.goto(
    `https://www.tripadvisor.com/Search?q=${city}&ssrc=e&geo=187070&o=${start}`
  );

  await page.waitForSelector(".pageNum");
  const pages = (await page.$$(".pageNum")).length;
  const restaurants = await page.$$(".content-column .result-content-columns");
  const urls = [];
  let lastPage = false;
  let timesDifferent = 0;
  for (const element of restaurants) {
    const cityName = await element.evaluate((element) =>
      element
        .querySelector(".address-text")
        ?.innerHTML.split(",")[1]
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );
    if (
      cityName !==
      city
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    ) {
      ++timesDifferent;
      if (timesDifferent > 2) {
        lastPage = true;
        break;
      }
    } else {
      timesDifferent = 0;
    }

    const url = await element.evaluate((element) =>
      element.getAttribute("onclick")?.split(",")[3].replace(/'/g, "").trim()
    );

    urls.push(url);
  }

  const leads: Lead[] = [];

  for (const url of urls) {
    console.log("visit " + url);
    await page.goto(`https://www.tripadvisor.com${url}`);

    try {
      const content = await page.content();
      const email = content.match(MAILTO_REGEX)?.[0].split(":")[1];
      const name = await page.$eval(
        "[data-test-target='top-info-header']",
        (element) => element.textContent
      );

      if (!email || !name) continue;
      leads.push({ name, email, city });
    } catch (error) {
      console.error("missing element in ", url);
    }
  }

  return { pages: lastPage ? 0 : pages, leads };
};

const scrapeCity = async (page: Page, city: string) => {
  let { pages, leads } = await scrapeCityPage(page, city, "0");
  for (let i = 2; i <= pages; i++) {
    let { leads: newLeads, pages: newPages } = await scrapeCityPage(
      page,
      city,
      ((i - 1) * 30).toString()
    );

    leads.push(...newLeads);
    if (newPages !== pages) {
      return leads;
    }
  }
  return leads;
};

const crawler = async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const leads: Lead[] = [];
    let index = 0;
    for (const city of cities) {
      console.log("start ", city);
      try {
        const newLeads = await scrapeCity(page, city);
        leads.push(...newLeads);
        console.log(index, city, newLeads.length);
      } catch (error) {
        console.error(error);
      }
      ++index;
      if (index % 50 === 0) {
        writeFileSync("leads.json", JSON.stringify(leads, null, 2));
      }
    }
    await page.close();
    await browser.close();
  } catch (error) {
    console.error(error);
  }
};

crawler();
