const { chromium } = require('playwright');
const printPdfContent = require('./pdfPrinter.JS');
const axios = require('axios');
require('dotenv').config();

async function iniciarAventura() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(process.env.MAIN_PAGE);

  await login(page);

  // siglo XIV
  const codeSigloXIV = await unlockSigloXIV(page)
  console.log('CODE SIGLO XIV: ', codeSigloXIV)
  
  // siglo XV
  const codeSigloXV = await unlockSigloXV(page, codeSigloXIV)
  console.log("CODE SIGLO XV: ", codeSigloXV)

  // siglo XVI
  const codeSigloXVI = await unlockSigloXVI(page, codeSigloXV)
  console.log("CODE SIGLO XVI: ", codeSigloXVI)

  // navigate to page 2
  await page.getByRole('button', { name: '2' }).click()

  // siglo XVII
  const codeSigloXVII = await unlockSigloXVII(page, codeSigloXVI)
  console.log("CODE SIGLO XVII: ", codeSigloXVII)

  // siglo XVIII
  const sigloXVIII = await unlockSigloXVIII(page, codeSigloXVII)
  console.log(sigloXVIII)
  

}

async function unlockSigloXIV(page) {
  const path = await downloadPDF(page, './sigloXIV.pdf');
  console.log('📄 Archivo descargado en:', path);
  let pdfData = await printPdfContent(path);
  await page.waitForTimeout(1000);
  while (! pdfData) {
    console.warn('❌ Retrying parse...');
    pdfData = await printPdfContent(path)
  }
  return extractAccessCode(pdfData.text) 
}

async function unlockSigloXV(page, codeSigloXIV) {
  const inputSigloXV = await getInputByCentury(page, "Siglo XV")
  await inputSigloXV.fill(codeSigloXIV);
  await inputSigloXV.press('Enter');
  await downloadPDF(page, './sigloXV.pdf');
  let pdfDataSigloXV = await printPdfContent('./sigloXV.pdf');
  while (! pdfDataSigloXV) {
    console.warn('❌ Retrying parse...');
    pdfDataSigloXV = await printPdfContent('./sigloXV.pdf')
  }
  const codeSigloXV = extractAccessCode(pdfDataSigloXV.text)
  return codeSigloXV
}

async function unlockSigloXVI(page, codeSigloXV) {
  const inputSigloXVI = await getInputByCentury(page, "Siglo XVI")
  await inputSigloXVI.fill(codeSigloXV);
  await inputSigloXVI.press('Enter');
  await downloadPDF(page, './sigloXVI.pdf');
  let pdfDataSigloXVI = await printPdfContent('./sigloXVI.pdf');
  while (! pdfDataSigloXVI) {
    console.warn('❌ Retrying parse...');
    pdfDataSigloXVI = await printPdfContent('./sigloXVI.pdf')
  }
  const codeSigloXVI = extractAccessCode(pdfDataSigloXVI.text)
  return codeSigloXVI
}

async function unlockSigloXVII(page, codeSigloXVI) {
  await clickVerDocumentacion(page, 'Siglo XVII')
  const apiInfo = await extractApiInfoFromModal(page)
  const manuscritoSigloXVII = await getManuscritoBySiglo(page, 'Siglo XVII')
  const responseChallenge = await callChallengeEndpoint(apiInfo, manuscritoSigloXVII, codeSigloXVI)
  const passwordSigloXVII = await decodeChallengePassword(responseChallenge.challenge)
  const closeModalButton = page.locator('button[aria-label="Cerrar modal"]');
  await closeModalButton.click();
  const inputSigloXVII = await getInputByCentury(page, "Siglo XVII")
  await inputSigloXVII.fill(passwordSigloXVII);
  await inputSigloXVII.press('Enter');
  await closeModalButton.click();
  await downloadPDF(page, './sigloXVII.pdf');
  let pdfDataSigloXVII = await printPdfContent('./sigloXVII.pdf');
  while (! pdfDataSigloXVII) {
    console.warn('❌ Retrying parse...');
    pdfDataSigloXVII = await printPdfContent('./sigloXVII.pdf')
  }
  const codeSigloXVII = extractAccessCode(pdfDataSigloXVII.text)
  return codeSigloXVII
}

async function unlockSigloXVIII(page, codeSigloXVII) {
  const pdfPath = './sigloXVIII.pdf'
  await clickVerDocumentacion(page, 'Siglo XVIII')
  const apiInfo = await extractApiInfoFromModal(page)
  const manuscrito = await getManuscritoBySiglo(page, 'Siglo XVIII')
  const responseChallenge = await callChallengeEndpoint(apiInfo, manuscrito, codeSigloXVII)
  const password = await decodeChallengePassword(responseChallenge.challenge)
  const closeModalButton = page.locator('button[aria-label="Cerrar modal"]');
  await closeModalButton.click();
  const input = await getInputByCentury(page, "Siglo XVIII")
  await input.fill(password);
  await input.press('Enter');
  await closeModalButton.click();
  await downloadPDF(page, pdfPath);
  let pdfData = await printPdfContent(pdfPath);
  while (! pdfData) {
    console.warn(`❌ Retrying parse ${pdfPath}...`);
    pdfData = await printPdfContent(pdfPath)
  }
  return pdfData.text
}

async function getManuscritoBySiglo(page, siglo) {
  const cards = await page.$$('.group');

  for (const card of cards) {
    const sigloText = await card.$eval('.text-sherpa-textSecondary span', el => el.textContent.trim());
    
    if (sigloText === siglo) {
      const title = await card.$eval('h3', el => el.textContent.trim());
      return title;
    }
  }

  return null; // No match found
}

async function callChallengeEndpoint(apiInfo, bookTitle, unlockCode) {
  const { endpoint, queryParams } = apiInfo;

  // Build query string
  const query = {
    bookTitle: bookTitle,
    unlockCode: unlockCode
  };

  // Optional: Validate that required query params are present
  for (const param of queryParams) {
    if (!query[param]) {
      console.warn(`Missing query param: ${param}`);
    }
  }

  try {
    const response = await axios.get(endpoint, { params: query });
    return response.data
  } catch (error) {
    console.error('❌ Error fetching challenge:', error.response?.data || error.message);
  }
}

function decodeChallengePassword(challenge) {
  const { vault, targets } = challenge;

  function binarySearch(arr, targetIndex) {
    let low = 0;
    let high = arr.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (mid === targetIndex) return arr[mid];
      if (mid < targetIndex) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    throw new Error(`Index ${targetIndex} not found`);
  }

  const passwordChars = targets.map(index => binarySearch(vault, index));
  return passwordChars.join('');
}

async function extractApiInfoFromModal(page) {
  // Wait for the modal to appear
  const modal = page.locator('.sherpa-card');
  await modal.waitFor();

  // Extract the endpoint URL
  const endpoint = await modal.locator('pre').textContent();

  // Extract query parameter keys
  const paramElements = modal.locator('li > code');
  const count = await paramElements.count();

  const queryParams = [];
  for (let i = 0; i < count; i++) {
    const param = await paramElements.nth(i).textContent();
    if (param) queryParams.push(param.trim());
  }

  // Return structured object
  return {
    endpoint: endpoint?.trim(),
    queryParams
  };
}

async function clickVerDocumentacion(page, siglo) {
  const sigloLabel = await page.getByText(siglo, { exact: true });
  const card = sigloLabel.locator('xpath=ancestor::div[contains(@class, "group")]');
  await card.getByRole('button', { name: 'Ver Documentación' }).click();
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