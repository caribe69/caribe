# Reporte por turno — "Versión 2" (hojita de cierre)

Réplica digital de la hojita de papel que se llena a mano al cerrar el turno.
**Es solo lectura**: no emite boletas/facturas, no cobra, no modifica nada. Solo
lee los datos del turno y los muestra/imprime con el mismo diseño del papel.

- Dónde: **Caja → (ver un turno) → Detalle de turno → botón 🧾 Versión 2**.
- Botones: **Imprimir** (abre una ventana con el ticket y manda a imprimir).
- El **mismo HTML** se usa para previsualizar e imprimir, por eso se ven idénticos.

---

## 1. De dónde sale cada dato

Endpoint: `GET /caja/:id/reporte-boleta2` (`caja.service.ts → reporteBoleta2`).

### Cabecera
- **Día de la semana / fecha**: de `turno.abiertoEn`.
- **Usuario**: `turno.usuario.username` (o su nombre).
- **Sede**: `turno.sede.nombre`.

### Bloque de dinero (izquierda)
| Código | Significado | Cálculo |
|---|---|---|
| **H** | Habitaciones | Parte de cada pago del turno proporcional al precio de la habitación: `Σ pago × (precioHabitacion / total)` |
| **B** | Bebidas | Suma de productos vendidos cuya **categoría** contiene "bebid" |
| **O** | Otros | Suma de productos vendidos cuya categoría **no** es bebida |
| **G** | Total | `H + B + O` |
| **− Digital** | Pagos digitales | `Visa + Master + Yape + Plin + Otro` |
| **= Efectivo** | Efectivo | `G − Digital` |

> Los "pagos digitales" son cualquier método que no sea EFECTIVO. En el papel
> todos se anotan como "Visa"; aquí se muestran desglosados pero suman lo mismo.

### Bloque derecho
- **Visa ⇒ (monto)**: total digital del turno.
- Debajo, desglose chico: Visa / Master / Yape / Plin / Otro.

### Ingresos por puerta
- **P1** = alquileres del turno con `modoLlegada = PIE` (a pie).
- **P2** = alquileres del turno con `modoLlegada = VEHICULO`.
- **Total** = P1 + P2 (personas/ingresos que entraron).
- (Se usa el campo **"¿Cómo llegó?"** que se registra al crear el alquiler o la reserva.)

### Limpieza
- **N°** = total de habitaciones limpiadas durante el turno.
- Nombre(s) del/los que limpiaron.
- Se cuentan las `TareaLimpieza` con estado `COMPLETADA` y `completadaEn` dentro
  de la ventana del turno (`abiertoEn` → `cerradoEn` o ahora si sigue abierto).

### Productos (dos columnas de códigos fijos)
Igual que el papel, hay dos columnas con **códigos fijos**:

- **Izquierda (Bebidas):** `CB CN CT IM CM SM GAT FRU VIN PISC WIS GUA EVE`
- **Derecha (Otros):** `TH SH PIEL CEPI KOLY JABO SHIK PEIN GALL HALL CHIC PIQU`

Cada renglón muestra: **código · cantidad · subtotal**. Al final, la suma de la
columna (Σ B = total bebidas, Σ O = total otros).

---

## 2. Cómo se llena cada código (importante)

El sistema **empareja** cada producto vendido con un código fijo comparando el
**nombre del producto**: si el nombre (en mayúsculas, sin espacios/tildes)
**empieza** por el código, se suma en ese renglón.

Ejemplos:
- Un producto llamado **"CB Pilsen"** o **"Cerveza CB"**… → NO. Debe **empezar** por `CB`.
  - "CB Pilsen" ✔ (empieza por CB)
  - "Cerveza Blanca" ✖ (no empieza por CB) → cae en "extras" al final de la columna.
- "GATORADE" → empieza por `GAT` ✔
- "PISCO" → empieza por `PISC` ✔ (los códigos largos ganan a los cortos)

**Recomendación:** para que los renglones se llenen solos, nombra los productos
empezando por su código (ej. `CB - Cerveza`, `SH - Shampoo`, `KOLY - Pasta`).
Los productos que no coincidan con ningún código **igual se muestran** como
renglones "extra" al final de su columna (bebida u otros), y **igual suman** en Σ.

> La clasificación **Bebida vs Otros** se decide por la **categoría** del producto
> (no por el código): categoría con "bebida" → columna izquierda; el resto → derecha.

---

## 3. Archivos que intervienen

Backend (solo se **agregó**, no se modificó el reporte existente):
- `backend/src/caja/caja.service.ts` → método **`reporteBoleta2(id, user)`**.
  - `CODIGOS_BEBIDAS`, `CODIGOS_OTROS` = listas fijas de la hojita.
  - `armarPlantilla(...)` = empareja productos con códigos por prefijo del nombre.
- `backend/src/caja/caja.controller.ts` → endpoint **`GET :id/reporte-boleta2`**.

Frontend:
- `frontend/src/pages/Caja.tsx`:
  - Botón **"🧾 Versión 2"** en el header del modal de detalle de turno.
  - `Boleta2Modal` = trae el reporte y lo muestra.
  - `buildBoleta2Html(data)` = arma **el mismo HTML** para preview e impresión.
  - `B2_STYLES` = estilos del ticket (bordes negros, monospace, tipo comanda).

---

## 4. Cómo cambiar los códigos o el diseño

- **Agregar/quitar códigos**: edita `CODIGOS_BEBIDAS` / `CODIGOS_OTROS` en
  `caja.service.ts`. Aparecerán como renglones nuevos automáticamente.
- **Layout/estilos**: edita `B2_STYLES` y `buildBoleta2Html` en `Caja.tsx`.
- Como preview e impresión usan la **misma** función, cualquier cambio se refleja
  en ambos a la vez.

---

## 5. Ejemplo (según la hojita de muestra)
```
H 200.00   B 30.00   O 4.00
G 234.00   − 134.00 (Visa)   = 100.00 efectivo
P1 2   P2 3   Total 5     Limpieza N° 10 · Galy
Bebidas:  CB 2 = 20.00 · CT 1 = 10.00 …  Σ B = 30.00
Otros:    SH 2 = 4.00 …                   Σ O = 4.00
```
