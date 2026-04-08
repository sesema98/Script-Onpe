const ExcelJS = require('exceljs');

function normalizeCell(value) {
  if (value && typeof value === 'object') {
    if (value.text) {
      return String(value.text).trim();
    }

    if (value.result) {
      return String(value.result).trim();
    }
  }

  return String(value || '').trim().replace(/\.0$/, '');
}

async function readDnisFromWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo no contiene hojas de calculo.');
  }

  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((value) => normalizeCell(value).toUpperCase());
  const dniColumnIndex = headers.findIndex((header) => header === 'DNI') + 1;

  if (!dniColumnIndex) {
    throw new Error('No se encontro una columna llamada DNI.');
  }

  const dnis = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const dni = normalizeCell(row.getCell(dniColumnIndex).value);
    if (!dni) {
      return;
    }

    dnis.push(dni);
  });

  if (dnis.length === 0) {
    throw new Error('No se encontraron DNIs validos para procesar.');
  }

  return dnis;
}

async function exportResults(results, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resultados');

  worksheet.columns = [
    { header: 'DNI', key: 'dni', width: 15 },
    { header: 'Miembro de mesa', key: 'miembroMesa', width: 20 },
    { header: 'Region', key: 'region', width: 20 },
    { header: 'Provincia', key: 'provincia', width: 20 },
    { header: 'Distrito', key: 'distrito', width: 20 },
    { header: 'Direccion del local de votacion', key: 'direccionLocal', width: 45 },
    { header: 'Fuente', key: 'fuente', width: 18 },
    { header: 'Observacion', key: 'observacion', width: 45 },
  ];

  results.forEach((result) => worksheet.addRow(result));

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = {
  readDnisFromWorkbook,
  exportResults,
};