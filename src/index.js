const { chromium } = require('playwright');
const printPdfContent = require('./pdfPrinter.JS');
require('dotenv').config();

async function iniciarAventura() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(process.env.MAIN_PAGE);

  await login(page);
  const path = await downloadCodexAureusdeEchternach(page);
  console.log('📄 Archivo descargado en:', path);

  const success = await printPdfContent(path);
  if (!success) {
    console.warn('❌ Retrying download and parse...');
    await page.waitForTimeout(1000);
    await iniciarAventura();
  }

  // await browser.close(); // Optional
}

async function login(page) {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('text=Acceder');
}

async function downloadCodexAureusdeEchternach(page) {
  await page.waitForSelector('text=Descargar PDF');

  const maxRetries = 6;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de descarga...`);
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 3000 }),
        page.click('text=Descargar PDF'),
      ]);

      const tempPath = './temp.pdf';
      await download.saveAs(tempPath);
      return tempPath;
    } catch (error) {
      console.warn(`⚠️ Falló el intento ${attempt}:`, error.message);
      if (attempt === maxRetries) {
        console.error('❌ No se pudo descargar el PDF después de varios intentos.');
      } else {
        await page.waitForTimeout(1000);
      }
    }
  }
}

iniciarAventura();

module.exports = iniciarAventura;
