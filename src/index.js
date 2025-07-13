const { chromium } = require('playwright');
const printPdfContent = require('./pdfPrinter.JS');
require('dotenv').config();

async function iniciarAventura() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(process.env.MAIN_PAGE);

  await login(page);
  const path = await downloadPDF(page, './sigloXIV.pdf');
  console.log('📄 Archivo descargado en:', path);

  let pdfData = await printPdfContent(path);
  await page.waitForTimeout(1000);
  while (! pdfData) {
    console.warn('❌ Retrying parse...');
    pdfData = await printPdfContent(path)
  }
  const code = extractAccessCode(pdfData.text) 
  console.log(code)
  const inputSigloXV = await getInputByCentury(page, "Siglo XV")
  await inputSigloXV.fill(code);
  await inputSigloXV.press('Enter');
  await downloadPDF(page, './sigloXV.pdf');
  let pdfDataSigloXV = await printPdfContent('./sigloXV.pdf');
  while (! pdfDataSigloXV) {
    pdfDataSigloXV = await printPdfContent('./sigloXV.pdf')
  }
  const codeSigloXV = extractAccessCode(pdfDataSigloXV.text)
  console.log(codeSigloXV)

}

function extractAccessCode(text) {
  const match = text.match(/C.‡digo de acceso:\s*(\S+)/);
  return match ? match[1] : null;
}

async function getInputByCentury(page, sigloText) {
  await page.waitForSelector('div.group'); // or something inside the block like 'span.text-sm'

  const groupBlocks = page.locator('div.group');
  const count = await groupBlocks.count();

  for (let i = 0; i < count; i++) {
    const block = groupBlocks.nth(i);

    // Find the "Siglo" text inside this block only
    const sigloSpan = block.locator('span.text-sm');
    const spanCount = await sigloSpan.count();

    for (let j = 0; j < spanCount; j++) {
      const text = (await sigloSpan.nth(j).innerText())?.replace(/\s+/g, ' ').trim();

      if (text === sigloText) {
        const input = block.locator('input[type="text"]');
        if (await input.count() > 0) {
          return input.first();
        }
      }
    }
  }

  console.error(`❌ No input found for "${sigloText}"`);
  return null;
}


async function login(page) {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('text=Acceder');
}

async function downloadPDF(page, tempPath) {
  await page.waitForSelector('text=Descargar PDF');

  const maxRetries = 6;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de descarga...`);
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 3000 }),
        page.click('text=Descargar PDF'),
      ]);
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
