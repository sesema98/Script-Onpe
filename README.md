# Script-Onpe

Aplicacion web en Node.js para cargar un archivo Excel con DNIs, consultar la pagina oficial de ONPE mediante Playwright y descargar un nuevo Excel con los resultados.

## Objetivo

El sistema automatiza este flujo:

1. Lee un archivo `.xlsx`.
2. Busca una columna llamada `DNI`.
3. Consulta DNI por DNI en `https://consultaelectoral.onpe.gob.pe/inicio`.
4. Muestra una vista previa en la interfaz web.
5. Genera un Excel final con los resultados obtenidos.

## Tecnologias usadas

- Node.js
- Express
- EJS
- Playwright
- ExcelJS
- Docker

## Requisitos

- Node.js 18 o superior
- npm
- Docker Desktop, si quieres usar contenedores
- Conexion a internet

## Estructura del proyecto

```text
Script-Onpe/
|-- app.js
|-- package.json
|-- package-lock.json
|-- Dockerfile
|-- Dockerfile.optimizado
|-- Dockerfile.multistage
|-- README.md
|-- public/
|   |-- app.js
|   `-- styles.css
|-- services/
|   |-- excelService.js
|   `-- onpeService.js
|-- uploads/
|   `-- .gitkeep
|-- results/
|   `-- .gitkeep
`-- views/
    `-- index.ejs
```

## Formato del archivo de entrada

El Excel debe ser `.xlsx` y la primera fila debe incluir una columna llamada exactamente `DNI`.

Ejemplo:

```text
| DNI      |
|----------|
| 12345678 |
| 87654321 |
| 11223344 |
```

Si el archivo no tiene la columna `DNI`, la app rechaza el procesamiento.

## Reproduccion local

### 1. Instalar dependencias

```bash
npm install
```

Nota: durante `npm install` se ejecuta `playwright install chromium`, por lo que la primera instalacion puede tardar varios minutos.

### 2. Levantar la aplicacion

```bash
npm start
```

La aplicacion intenta iniciar en `http://localhost:3000`.

Si el puerto `3000` ya esta ocupado, la app prueba automaticamente con `3001`, `3002` y asi sucesivamente hasta encontrar un puerto libre.

### 3. Abrir la interfaz

Abre en el navegador la URL que aparezca en consola, por ejemplo:

```text
http://localhost:3000
```

o

```text
http://localhost:3001
```

### 4. Probar el flujo

1. Selecciona un archivo `.xlsx`.
2. Verifica que la columna principal se llame `DNI`.
3. Haz clic en `Consultar DNIs`.
4. Espera a que termine la automatizacion.
5. Revisa la tabla HTML.
6. Descarga el Excel generado.

### 5. Modo desarrollo

```bash
npm run dev
```

## Reproduccion con Docker

Las imagenes Docker usan el nombre `serva-app`.

### Imagen base

Construccion:

```bash
docker build -t serva-app:v1.0 .
```

Ejecucion:

```bash
docker run -d --name serva_base -p 3100:3000 serva-app:v1.0
```

Abrir:

```text
http://localhost:3100
```

### Imagen optimizada

Construccion:

```bash
docker build -f Dockerfile.optimizado -t serva-app:alpine .
```

Ejecucion:

```bash
docker run -d --name serva_alpine -p 3101:3000 serva-app:alpine
```

Abrir:

```text
http://localhost:3101
```

### Imagen multistage

Construccion:

```bash
docker build -f Dockerfile.multistage -t serva-app:multi .
```

Ejecucion:

```bash
docker run -d --name serva_multi -p 3102:3000 serva-app:multi
```

Abrir:

```text
http://localhost:3102
```

## Verificacion de contenedores

Ver contenedores en ejecucion:

```bash
docker ps
```

Ver logs:

```bash
docker logs serva_base
docker logs serva_alpine
docker logs serva_multi
```

Ver imagenes generadas:

```bash
docker images | grep serva-app
```

Ver historial de capas:

```bash
docker history serva-app:v1.0
docker history serva-app:alpine
docker history serva-app:multi
```

## Variables de entorno utiles

- `PORT=3000`
- `PORT_RETRY_LIMIT=20`
- `ONPE_URL=https://consultaelectoral.onpe.gob.pe/inicio`
- `ONPE_DNI_INPUT=input[placeholder*="DNI" i], input[name*="dni" i], input[id*="dni" i]`
- `ONPE_SUBMIT_BUTTON=button:has-text("Consultar"), button:has-text("Buscar"), button[type="submit"]`
- `PLAYWRIGHT_HEADLESS=true`
- `PLAYWRIGHT_TIMEOUT_MS=45000`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser`

Estas variables existen porque la pagina oficial puede cambiar su estructura o sus tiempos de respuesta.

## Problemas comunes

### Puerto 3000 ocupado

Si en local aparece `EADDRINUSE`, la app ya esta preparada para intentar el siguiente puerto libre automaticamente.

### Chromium o Playwright no instalados

Si el navegador de Playwright no quedo instalado correctamente:

```bash
npx playwright install chromium
```

### Error en Docker por nombre de imagen

Para Docker usa `serva-app`. No uses `serva_` como nombre de imagen porque Docker no acepta ese formato de tag en este caso.

### La consulta de ONPE falla

Puede pasar por cualquiera de estas razones:

- la web oficial esta lenta
- la web oficial cambio selectores o estructura
- hubo timeout en Playwright
- hubo bloqueo temporal del sitio

Si ONPE cambia su interfaz, debes ajustar selectores en `services/onpeService.js` o mediante variables de entorno.

## Limpieza

Detener y borrar contenedores:

```bash
docker rm -f serva_base serva_alpine serva_multi
```

Liberar cache de builds:

```bash
docker builder prune -af
```

## Consideraciones

- La app no simula resultados; intenta consultar la pagina real.
- El tiempo final depende de la velocidad de respuesta de ONPE.
- Las imagenes Docker pueden ser pesadas por el uso de Playwright y Chromium.
- El Excel de salida se genera incluso si algun DNI falla, dejando observaciones por fila.

## Conclusiones

- Se puede reproducir la aplicacion tanto localmente como con contenedores.
- Docker permite comparar una version base, una version Alpine y una version multistage.
- El flujo principal queda automatizado: lectura de Excel, consulta web y exportacion final.
