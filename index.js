require('dotenv').config();
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const TelegramBotToken = process.env.BOT_TOKEN;
const bot = new TelegramBot(TelegramBotToken, { polling: { interval: 1000 } });
const CHAT_ID_VALERON = process.env.CHAT_ID_VALERON;
const CHAT_ID_ME = process.env.CHAT_ID_ME;
const PORT = process.env.PORT || 5000;

const webSitesUrl = [
  {
    url: 'https://rozetka.com.ua/playstation_5_digital_edition_2/p223596301/',
    name: 'rozetka',
    expectedPath: '.status-label',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
  {
    url: 'https://rozetka.com.ua/ua/playstation_5/p223588825/?utm_source=from_app',
    name: 'rozetka-disk',
    expectedPath: '.status-label',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
  {
    url: 'https://www.moyo.ua/ua/igrovaya-pristavka-sony-playstation-5-digital-edition/468817.html',
    name: 'moyo',
    expectedPath: '#main-product > div.tovar-tabs > div.tovar-tabs-content-list > ul > li.tovar-tabs-content.tovar-main-tab-content.tovar-tabs-content--active > div.tovar_maininfo > div.tovar_info.tovar-status-type--archive > div.tovar-info-price.tovar-info-price--archive.Roboto.tovar-info-price--without-pre-order-start-date > div.tovar-info-price-header > div',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
  {
    url: 'https://www.moyo.ua/ua/igrovaya-pristavka-sony-playstation-5-digital-edition/468817.html',
    name: 'moyo-disk',
    expectedPath: '.tovar-status-text',
    expectedText: ['Немає в наявності', 'Нет в наличии', 'Товар закінчився', 'Товар закончился']
  },
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
      await page.goto(url, { waitUntil: 'load', timeout: 0 })
      const element = await page.$eval(expectedPath, el => el.textContent);

      console.log('element', element)

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
    CHAT_ID_VALERON,
    `ON <b>${name}</b> SOMETHING WAS CHANGED, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );

  bot.sendMessage(
    CHAT_ID_ME,
    `ON <b>${name}</b> SOMETHING WAS CHANGED, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );
};

const sendMissingUpdate = (name, url) => {
  bot.sendMessage(
    CHAT_ID_VALERON,
    `ON <b>${name}</b> EXPECTED ELEMENT WASN'T FOUNT, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );
  
  bot.sendMessage(
    CHAT_ID_ME,
    `ON <b>${name}</b> EXPECTED ELEMENT WASN'T FOUNT, CHECK THIS LINK \n<a href="${url}">${url}</a>`,
    { parse_mode: "HTML" }
  );
};

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log('chatId', chatId)

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, 'Received your message');
});

// let errorsCounter = 0;
async function urlChecker({ url, name, expectedPath, expectedText }) {
  const element = await getElement(url, expectedPath)

  if (!element) {
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