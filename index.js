require('dotenv').config();
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const TelegramBotToken = process.env.BOT_TOKEN;
const bot = new TelegramBot(TelegramBotToken, { polling: { interval: 1000 } });
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 5000;

const webSitesUrl = [
  {
    url: 'https://rozetka.com.ua/playstation_5_digital_edition_2/p223596301/',
    name: 'rozetka',
    expectedPath: 'body > app-root > div > div:nth-child(2) > app-rz-product > div > product-tab-main > div:nth-child(1) > div:nth-child(1) > div.product-about__right > product-main-info > ul > li:nth-child(1) > p',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
  {
    url: 'https://allo.ua/ru/igrovye-pristavki/konsol-playstation-5-digital-edition.html',
    name: 'allo',
    expectedPath: '#__layout > div > div.page__content.page__content--inverse > div.product-view > ul > li.product-basic-content.product-view-content__section > div.product-basic-content__data.main-data > div.main-data__trade.product-trade > div > div > p',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
  {
    url: 'https://www.moyo.ua/igrovaya_pristavka_playstation_5_digital_edition_pervaya_postavka_/475056.html',
    name: 'moyo',
    expectedPath: '#main-product > div.tovar-tabs > div.tovar-tabs-content-list > ul > li.tovar-tabs-content.tovar-main-tab-content.tovar-tabs-content--active > div.tovar_maininfo > div.tovar_info.tovar-status-type--outofstock > div.tovar-info-price.tovar-info-price--outofstock.Roboto.tovar-info-price--without-pre-order-start-date > div.tovar-info-price-header.tovar-info-price-header--outofstock > div',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  }
];

async function getElement(url, expectedPath) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
    const page = await browser.newPage()
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 })
      const element = await page.$eval(expectedPath, el => el.textContent);

      await page.close()
      await browser.close()
      return element.trim()
    } catch(e) {
      await page.close()
      await browser.close()
      return null
    }
  } catch (e) {
    console.log(e)
  };
};

const sendUpdate = (name, url) => {
  bot.sendMessage(
    CHAT_ID,
    `ON <b>${name}</b> SOMETHING WAS CHANGED, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );
};

async function urlChecker({ url, name, expectedPath, expectedText }) {
  const element = await getElement(url, expectedPath)

  if (element === null) {
    console.error(`something crashed on ${name}, going for the next steps`)
    return null
  }

  console.log(`${name.toUpperCase()} current: ${element} - expected: ${expectedText[0]}/${expectedText[1]}/${expectedText[2]}/${expectedText[3]}`)
  if (!expectedText.includes(element)) {
    sendUpdate(name, url)
  }
  return element
};

app.listen(PORT, '0.0.0.0', () => {
  schedule.scheduleJob(`*/1 * * * *`, async () => {
    try {
      await webSitesUrl.reduce(async (promise, item) => {
        // waiting for the previous promise
        await promise;
        await urlChecker(item)
      }, Promise.resolve());
    } catch (e) {
      console.log('error', error)
    }
  });
});