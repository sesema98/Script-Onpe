const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { readDnisFromWorkbook, exportResults } = require('./services/excelService');
const { lookupWorkers } = require('./services/onpeService');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const PORT_RETRY_LIMIT = Number(process.env.PORT_RETRY_LIMIT || 20);
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');

[uploadsDir, resultsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];

    const isExcel = allowed.includes(file.mimetype) || /\.xlsx$/i.test(file.originalname);
    if (isExcel) {
      cb(null, true);
      return;
    }

    cb(new Error('Solo se permiten archivos Excel .xlsx'));
  },
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function buildStats(results = []) {
  return results.reduce(
    (summary, item) => {
      summary.total += 1;

      if (item.miembroMesa === 'Si') {
        summary.si += 1;
      } else if (item.miembroMesa === 'No') {
        summary.no += 1;
      } else {
        summary.revision += 1;
      }

      return summary;
    },
    {
      total: 0,
      si: 0,
      no: 0,
      revision: 0,
    }
  );
}

function renderHome(res, payload = {}) {
  const viewModel = {
    results: [],
    downloadFile: null,
    error: null,
    originalName: null,
    info: null,
    ...payload,
  };

  viewModel.stats = buildStats(viewModel.results);

  res.render('index', viewModel);
}

app.get('/', (_req, res) => {
  renderHome(res, {
    info: 'La consulta usa automatizacion web real con Playwright sobre la pagina oficial. El tiempo depende de la respuesta del sitio.',
  });
});

app.post('/upload', upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    renderHome(res.status(400), {
      error: 'Selecciona un archivo Excel antes de procesar.',
    });
    return;
  }

  try {
    const dnis = await readDnisFromWorkbook(req.file.path);
    const processed = await lookupWorkers(dnis);
    const resultName = `resultado-${path.parse(req.file.filename).name}.xlsx`;
    const outputPath = path.join(resultsDir, resultName);

    await exportResults(processed, outputPath);

    renderHome(res, {
      results: processed,
      downloadFile: resultName,
      originalName: req.file.originalname,
      info: `Se consultaron ${processed.length} registros contra la pagina oficial.` ,
    });
  } catch (error) {
    renderHome(res.status(400), {
      error: error.message || 'No se pudo procesar el archivo.',
      originalName: req.file ? req.file.originalname : null,
    });
  }
});

app.get('/download/:fileName', (req, res) => {
  const target = path.join(resultsDir, path.basename(req.params.fileName));

  if (!fs.existsSync(target)) {
    res.status(404).send('El archivo solicitado no existe.');
    return;
  }

  res.download(target);
});

app.use((error, _req, res, _next) => {
  renderHome(res.status(400), {
    error: error.message || 'Ocurrio un error inesperado.',
  });
});

function startServer(port, retriesLeft) {
  const server = app.listen(port, () => {
    console.log(`Servidor listo en http://localhost:${port}`);
  });

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Puerto ${port} en uso. Probando ${nextPort}...`);
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    console.error(`No se pudo iniciar el servidor en el puerto ${port}: ${error.message}`);
    process.exit(1);
  });
}

startServer(DEFAULT_PORT, PORT_RETRY_LIMIT);
