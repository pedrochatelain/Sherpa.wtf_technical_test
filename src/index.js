const { chromium } = require('playwright');
require('dotenv').config();

async function iniciarAventura() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navegar a la cripta
  await page.goto(process.env.MAIN_PAGE);

  await login(page);
}

async function login(page) {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('text=Acceder');
}

iniciarAventura();
