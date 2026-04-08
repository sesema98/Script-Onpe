const { chromium } = require('playwright');

const ONPE_URL = process.env.ONPE_URL || 'https://consultaelectoral.onpe.gob.pe/inicio';
const DNI_INPUT_SELECTOR = process.env.ONPE_DNI_INPUT || 'input[placeholder="N\u00famero de DNI"], input[type="tel"]';
const SUBMIT_BUTTON_SELECTOR = process.env.ONPE_SUBMIT_BUTTON || 'button.button_consulta, button:has-text("CONSULTAR"), button:has-text("Consultar")';
const PLAYWRIGHT_HEADLESS = process.env.PLAYWRIGHT_HEADLESS === 'true';
const PLAYWRIGHT_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_TIMEOUT_MS || 15000);
const PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

function splitUbigeo(value) {
  const parts = String(value || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    region: parts[0] || 'No disponible',
    provincia: parts[1] || 'No disponible',
    distrito: parts[2] || 'No disponible',
  };
}

function buildNotFoundResult(dni, observation) {
  return {
    dni,
    miembroMesa: 'No disponible',
    region: 'No disponible',
    provincia: 'No disponible',
    distrito: 'No disponible',
    direccionLocal: 'No disponible',
    fuente: 'ONPE',
    observacion: observation,
  };
}

function mapConsultaResult(data) {
  const ubigeo = splitUbigeo(data.ubigeo);
  const direccionLocal = [data.localVotacion, data.direccion].filter(Boolean).join(' - ') || 'No disponible';

  return {
    dni: data.dni || 'No disponible',
    miembroMesa: data.miembroMesa ? 'Si' : 'No',
    region: ubigeo.region,
    provincia: ubigeo.provincia,
    distrito: ubigeo.distrito,
    direccionLocal,
    fuente: 'ONPE',
    observacion: data.referencia ? `Referencia: ${data.referencia}` : 'Consulta oficial completada.',
  };
}

async function lookupSingleDni(page, dni) {
  await page.goto(ONPE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: PLAYWRIGHT_TIMEOUT_MS,
  });

  await page.waitForSelector(DNI_INPUT_SELECTOR, {
    timeout: PLAYWRIGHT_TIMEOUT_MS,
  });

  await page.locator(DNI_INPUT_SELECTOR).first().fill(String(dni));
  const submitButton = page.locator(SUBMIT_BUTTON_SELECTOR).first();
  await submitButton.waitFor({ timeout: PLAYWRIGHT_TIMEOUT_MS });

  const searchResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/v1/api/busqueda/dni') && response.request().method() === 'POST',
    { timeout: PLAYWRIGHT_TIMEOUT_MS }
  );

  await submitButton.click();
  const searchResponse = await searchResponsePromise;
  const searchJson = await searchResponse.json();

  if (!searchJson.success) {
    const message = String(searchJson.message || 'No fue posible consultar el DNI en ONPE.')
      .replace(/<[^>]+>/g, '')
      .trim();
    return buildNotFoundResult(dni, message);
  }

  const detailResponse = await page.waitForResponse(
    (response) => response.url().includes('/v1/api/consulta/definitiva') && response.request().method() === 'POST',
    { timeout: PLAYWRIGHT_TIMEOUT_MS }
  );

  const detailJson = await detailResponse.json();
  if (!detailJson.success || !detailJson.data) {
    return buildNotFoundResult(dni, detailJson.message || 'ONPE no devolvio el detalle de la consulta.');
  }

  return mapConsultaResult(detailJson.data);
}

async function lookupWorkers(dnis) {
  const browser = await chromium.launch({
    headless: PLAYWRIGHT_HEADLESS,
    executablePath: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    locale: 'es-PE',
    colorScheme: 'light',
  });

  const page = await context.newPage();
  const results = [];

  try {
    for (const dni of dnis) {
      try {
        results.push(await lookupSingleDni(page, dni));
      } catch (error) {
        results.push(buildNotFoundResult(dni, `No se pudo consultar este DNI: ${error.message}`));
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return results;
}

module.exports = {
  lookupWorkers,
};
