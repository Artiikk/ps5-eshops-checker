require('dotenv').config();
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const TelegramBotToken = process.env.BOT_TOKEN;
const bot = new TelegramBot(TelegramBotToken, { polling: true });
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 5000;

const webSitesUrl = [
  {
    url: 'https://rozetka.com.ua/playstation_5_digital_edition_2/p223596301/',
    name: 'rozetka',
    expectedPath: 'body > app-root > div > div:nth-child(2) > app-rz-product > div > product-tab-main > div:nth-child(1) > div:nth-child(1) > div.product-about__right > product-main-info > ul > li:nth-child(1) > p',
    expectedText: 'Нет в наличии'
  },
  {
    url: 'https://allo.ua/ru/igrovye-pristavki/konsol-playstation-5-digital-edition.html',
    name: 'allo',
    expectedPath: '#__layout > div > div.page__content.page__content--inverse > div.product-view > ul > li.product-basic-content.product-view-content__section > div.product-basic-content__data.main-data > div.main-data__trade.product-trade > div > div > p',
    expectedText: 'Нет в наличии'
  },
  {
    url: 'https://www.moyo.ua/igrovaya_pristavka_playstation_5_digital_edition_pervaya_postavka_/475056.html',
    name: 'moyo',
    expectedPath: '#main-product > div.tovar-tabs > div.tovar-tabs-content-list > ul > li.tovar-tabs-content.tovar-main-tab-content.tovar-tabs-content--active > div.tovar_maininfo > div.tovar_info.tovar-status-type--archive > div.tovar-info-price.tovar-info-price--archive.Roboto.tovar-info-price--without-pre-order-start-date > div.tovar-info-price-header > div',
    expectedText: 'Товар закончился'
  }
];

async function getElement(url, expectedPath) {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.goto(url)
    const element = await page.$eval(expectedPath, el => el.textContent);

    await page.close()
    return element.trim()
  } catch (e) {
    console.log(e)
  }
};

const sendUpdate = (name, url) => {
  bot.sendMessage(
    CHAT_ID,
    `ON <b>${name}</b> SOMETHING WAS CHANGED, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );
};

app.listen(PORT, '0.0.0.0', () => {
  schedule.scheduleJob(`*/1 * * * *`, () => {
    webSitesUrl.forEach(async ({ url, name, expectedPath, expectedText }) => {
      const element = await getElement(url, expectedPath)

      console.log(`${name} ${element}`, element)
      console.log(`${name} ${expectedText}`, expectedText)

      if (element && (element !== expectedText)) {
        sendUpdate(name, url)
      }
    });
  });
});