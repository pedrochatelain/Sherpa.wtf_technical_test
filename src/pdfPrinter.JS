const fs = require('fs');
const pdfParse = require('pdf-parse');

async function printPdfContent(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    console.log('pdfData.text', pdfData.text);
    return true;
  } catch (error) {
    console.error('Error reading PDF:', error.message);
    return false;
  }
}

module.exports = printPdfContent;
