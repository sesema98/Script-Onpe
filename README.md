# Serva_ - Validador de Miembros de Mesa

Aplicacion web construida con Node.js, Express, EJS y Playwright para cargar un archivo Excel con DNIs, consultar la pagina oficial de ONPE de forma automatizada y descargar un nuevo Excel con los resultados.

## Caracteristicas

- Carga de archivos Excel `.xlsx` desde una interfaz web
- Lectura automatica de la columna `DNI`
- Consulta web automatizada a la pagina oficial de ONPE
- Visualizacion de resultados en una tabla HTML
- Exportacion de resultados a un nuevo archivo Excel
- Estructura modular con vistas y servicios
- Contenedorizacion con Docker base, optimizado y multistage

## Estructura del proyecto

```text
serva_/
|-- app.js
|-- package.json
|-- Dockerfile
|-- Dockerfile.optimizado
|-- Dockerfile.multistage
|-- .dockerignore
|-- README.md
|-- public/
|   `-- styles.css
|-- results/
|   `-- .gitkeep
|-- services/
|   |-- excelService.js
|   `-- onpeService.js
|-- uploads/
|   `-- .gitkeep
`-- views/
    `-- index.ejs
```

## Requisitos

- Node.js 18 o superior
- npm
- Docker Desktop (opcional, para contenedores)
- Conexion a internet para que Playwright consulte la pagina oficial

## Instalacion y ejecucion local

```bash
npm install
npm start
```

La aplicacion quedara disponible en `http://localhost:3000`.

Para desarrollo con recarga automatica:

```bash
npm run dev
```

## Flujo de uso

1. Crea una hoja de calculo en Google Sheets.
2. Agrega una columna llamada exactamente `DNI` en la primera fila.
3. Ingresa varios DNIs debajo de esa columna.
4. Descarga el archivo como `Microsoft Excel (.xlsx)`.
5. En la aplicacion web, selecciona el archivo y presiona `Procesar archivo`.
6. La app abrira la pagina oficial de ONPE con Playwright y consultara DNI por DNI.
7. Revisa la tabla de resultados y descarga el Excel generado.

## Variables de entorno utiles

- `PORT=3000`
- `ONPE_URL=https://consultaelectoral.onpe.gob.pe/inicio`
- `ONPE_DNI_INPUT=input[placeholder*="DNI" i], input[name*="dni" i], input[id*="dni" i]`
- `ONPE_SUBMIT_BUTTON=button:has-text("Consultar"), button:has-text("Buscar"), button[type="submit"]`
- `ONPE_RESULT_CONTAINER=main, body`
- `PLAYWRIGHT_HEADLESS=true`
- `PLAYWRIGHT_TIMEOUT_MS=45000`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser`

Estas variables existen porque la interfaz oficial puede cambiar y a veces es necesario ajustar selectores.

## Construccion Docker

### Imagen base

```bash
docker build -t serva-app:v1.0 .
```

### Imagen optimizada

```bash
docker build -f Dockerfile.optimizado -t serva-app:alpine .
```

### Imagen multistage

```bash
docker build -f Dockerfile.multistage -t serva-app:multi .
```

## Ejecucion de contenedor

```bash
docker run -d -p 3000:3000 --name serva_app serva-app:v1.0
```

Luego abre `http://localhost:3000`.

## Consideraciones importantes

- Esta version ya no simula resultados: intenta consultar la web oficial.
- La pagina de ONPE puede cambiar su estructura, tiempos de respuesta o mecanismos de proteccion.
- Si cambian los campos de la pagina, deberas ajustar los selectores mediante variables de entorno o editando `services/onpeService.js`.
- Si algun DNI no se puede consultar, el Excel final igual se genera con una observacion por fila.
