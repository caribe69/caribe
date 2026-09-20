# Agente de Impresión · Sol Caribe

Puente entre el sistema web y la impresora de la PC. Corre en la propia
computadora del recepcionista y recibe los tickets desde la web para
imprimirlos **sin el diálogo del navegador**.

- Sin dependencias: solo necesita **Node.js** (v16 o mayor).
- Interfaz de configuración en `http://localhost:9110`.
- La impresora debe estar conectada a **esa PC** (USB, serial o red local).

## Cómo usarlo

1. Instala **Node.js** (https://nodejs.org) si la PC no lo tiene.
2. Doble clic en **`start.bat`** (abre el navegador en la interfaz y arranca el agente).
   - O desde una terminal: `node server.js`.
3. En la interfaz:
   - Elige la impresora de la lista.
   - **Guardar impresora**.
   - **Impresión de prueba** para confirmar.
4. Deja la ventana **abierta**. Mientras esté abierta, la web puede imprimir.

## Que arranque solo con Windows (recomendado)

Para que no haya que abrirlo a mano cada vez:

1. Presiona `Win + R`, escribe `shell:startup` y Enter (abre la carpeta de Inicio).
2. Crea ahí un **acceso directo** a `start.bat` (clic derecho → Enviar a → …, o
   arrastra con clic derecho → "Crear acceso directo aquí").
3. Listo: cada vez que inicie Windows, el agente arranca solo.

## Puerto

Por defecto escucha en `9110`. Para cambiarlo, arranca con:

```
set PRINT_AGENT_PORT=9200 && node server.js
```

## Cómo lo usa la web

El sistema envía los tickets con un POST:

```
POST http://localhost:9110/api/print
Content-Type: application/json

{ "titulo": "Ticket alquiler 201", "contenido": "…texto del ticket…", "copias": 1 }
```

Si no se manda `impresora`, usa la que quedó **configurada** en la interfaz.

Otros endpoints: `GET /api/status`, `GET /api/printers`, `POST /api/config`,
`POST /api/test`.

## Notas

- Imprime **texto** a la impresora elegida (funciona con cualquier impresora de
  Windows). El soporte de comandos crudos ESC/POS para térmicas se puede agregar
  después.
- La web (`https://sistema.caribeperu.com`) llama a `http://localhost`. Algunos
  navegadores tratan esto como "contenido mixto"; los navegadores basados en
  Chrome permiten `localhost` como origen de confianza. Si algún navegador lo
  bloquea, se resuelve sirviendo el agente con certificado local (siguiente fase).
