# NexoPOS — Integración con Nexo B2B API

## Contexto

Nexo B2B es un marketplace B2B entre **comercios** (minoristas, almacenes) y **mayoristas** (distribuidores). NexoPOS es un punto de venta que debe integrarse para que los comercios puedan:

1. Hacer login con su cuenta Nexo B2B
2. Ver los mayoristas con los que tienen relación
3. Navegar el catálogo de productos (unificado o filtrado por mayorista)
4. Enviar órdenes de compra al mayorista
5. Consultar el estado de sus órdenes

---

## Base URL

```
BASE_URL = https://nexob2b.app
```

Todos los endpoints usan `Content-Type: application/json`.

---

## Autenticación

**NexoPOS usa JWT Bearer token.** No hay API key. El token se obtiene con las credenciales del comercio y dura 30 días.

### Login

```
POST /store/comercios/auth
```

**Body:**
```json
{ "email": "comercio@ejemplo.com", "password": "mipassword" }
```

**Respuesta 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "comercio": {
    "id": "com_01JXXX",
    "nombre": "Almacén Don Juan",
    "email": "comercio@ejemplo.com",
    "estado": "aprobado",
    "ciudad": "Córdoba",
    "provincia": "Córdoba"
  }
}
```

**Errores:**
- `401` → credenciales incorrectas
- `403` → cuenta suspendida

**Uso del token:** todas las requests autenticadas llevan el header:
```
Authorization: Bearer <token>
```

El payload del JWT contiene `{ comercio_id: "com_01JXXX" }`.

---

## Módulo 1: Mayoristas

### Listar mayoristas disponibles

Devuelve todos los mayoristas aprobados, con el estado de la relación del comercio logueado y el contacto asignado (vendedor o el mayorista directamente).

```
GET /store/mayoristas/lista
Authorization: Bearer <token>
```

**Query params opcionales:**
| Param | Tipo | Descripción |
|---|---|---|
| `lat` | number | Latitud del comercio (para calcular distancia) |
| `lng` | number | Longitud del comercio |
| `radio_km` | number | Filtrar por distancia (default: 50 km) |
| `rubros` | string | Rubros separados por coma: `almacen,ferreteria` |
| `busqueda` | string | Búsqueda por nombre, ciudad, provincia, rubros |

**Respuesta 200:**
```json
{
  "mayoristas": [
    {
      "id": "may_01JXXX",
      "nombre": "Distribuidora El Sol",
      "ciudad": "Córdoba",
      "provincia": "Córdoba",
      "rubros": ["almacen", "limpieza"],
      "logo_url": "https://nexob2b.app/uploads/logos/sol.jpg",
      "lat": -31.416,
      "lng": -64.183,
      "distancia_km": 3.2,
      "solicitud": {
        "id": "sol_01JXXX",
        "estado": "aceptado",
        "created_at": "2026-01-15T10:00:00Z"
      },
      "contacto": {
        "nombre": "Pedro Gómez",
        "celular": "+5493512345678",
        "email": "pedro@elsol.com",
        "es_vendedor": true
      }
    }
  ],
  "meta": {
    "total": 12,
    "radio_km": 50
  }
}
```

**`solicitud.estado` posibles valores:**
- `"pendiente"` → el comercio pidió alta, el mayorista no respondió
- `"aceptado"` → tiene alta, puede hacer pedidos
- `"rechazado"` → el mayorista rechazó la solicitud
- `null` → nunca solicitó relación con ese mayorista

### Solicitar alta con un mayorista

```
POST /store/solicitudes
Authorization: Bearer <token>
```

**Body:**
```json
{ "mayorista_id": "may_01JXXX", "mensaje": "Hola, somos un almacén de barrio..." }
```

**Respuesta 201:**
```json
{ "solicitud": { "id": "sol_01JXXX", "estado": "pendiente", ... } }
```

**Error 409:** ya existe una solicitud con ese mayorista.

### Ver mis solicitudes

```
GET /store/solicitudes
Authorization: Bearer <token>
```

---

## Módulo 2: Catálogo de Productos

El catálogo está normalizado en **producto maestro** → múltiples mayoristas que lo venden → múltiples presentaciones (formatos/tamaños) por mayorista.

### Estructura del producto

```json
{
  "id": "pm_01JXXX",
  "ean": "7790040522014",
  "nombre": "Aceite de Girasol",
  "marca": "Cocinero",
  "unidad_base": "Litros",
  "alicuota_iva": 10.5,
  "imagen_url": "https://nexob2b.app/uploads/productos/aceite.jpg",
  "pasillo_id": "pas_01JXXX",
  "pasillo_nombre": "Aceites",
  "rubro_id": "rub_01JXXX",
  "rubro_nombre": "Almacén",
  "mayoristas": [
    {
      "listing_id": "pml_01JXXX",
      "mayorista_id": "may_01JXXX",
      "mayorista_nombre": "Distribuidora El Sol",
      "mayorista_logo": "https://...",
      "tiene_alta": true,
      "presentaciones": [
        {
          "id": "pmp_01JXXX",           // ← ESTE es el presentacion_id para hacer pedidos
          "presentacion_id": "pp_01JXXX",
          "nombre": "Bidón 5L",
          "factor": 5,
          "ean_propio": null,
          "precio": 8250.00,
          "precio_lista": 8500.00,
          "stock": 120,
          "orden": 1
        },
        {
          "id": "pmp_02JXXX",
          "nombre": "Botella 1.5L",
          "factor": 1.5,
          "precio": 2100.00,
          "precio_lista": 2200.00,
          "stock": 500
        }
      ]
    }
  ]
}
```

> **Importante:** el `id` dentro de `presentaciones` (el `pmp_xxxx`) es el `presentacion_id` que se envía al crear una orden. Es el identificador único de "este producto, en este formato, de este mayorista".

`tiene_alta: true` significa que el comercio logueado tiene relación aceptada con ese mayorista y puede hacerle pedidos.

### Catálogo unificado (todos los mayoristas)

```
GET /store/productos
Authorization: Bearer <token>  (opcional, pero si se envía calcula tiene_alta)
```

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `q` | string | Búsqueda por nombre, EAN o marca |
| `comercio_id` | string | Para calcular `tiene_alta` (usar ID del comercio logueado) |
| `pasillo_id` | string | Filtrar por pasillo |
| `rubro_id` | string | Filtrar por rubro |
| `subrubro_id` | string | Filtrar por subrubro |
| `mayorista_id` | string | Filtrar solo a productos de un mayorista específico |
| `incluir_sin_mayorista` | `"true"` | Agrega también los productos maestros aprobados que ningún mayorista lista, con `"mayoristas": []`. Lo usa NexoPOS para dar de alta stock comprado fuera de NexoB2B (solo la ficha del producto). Se ignora si viene `mayorista_id`. |

**Ejemplo — catálogo de un mayorista específico:**
```
GET /store/productos?mayorista_id=may_01JXXX&comercio_id=com_01JXXX&q=aceite
```

**Respuesta 200:**
```json
{ "productos": [ { ...estructura del producto arriba... } ] }
```

Límite: 100 productos por request.

### Catálogo autenticado (para NexoPOS — usa JWT directamente)

```
GET /api/v1/pos/productos
Authorization: Bearer <token>
```

Idéntico al anterior pero el `comercio_id` viene del JWT (no hay que pasarlo como query param). `tiene_alta` siempre se calcula.

**Query params:** `q`, `pasillo_id`, `rubro_id`, `subrubro_id`, `mayorista_id`

Límite: 200 productos por request.

### Taxonomía (filtros)

Cargar una vez al iniciar la app y cachear.

```
GET /store/taxonomia
```

**Respuesta 200:**
```json
{
  "pasillos": [ { "id": "pas_01JXXX", "nombre": "Aceites" } ],
  "rubros": [ { "id": "rub_01JXXX", "nombre": "Almacén", "pasillo_id": "pas_01JXXX" } ],
  "subrubros": [ { "id": "sub_01JXXX", "nombre": "Aceites vegetales", "rubro_id": "rub_01JXXX" } ],
  "alicuotas": [ { "id": "ali_01JXXX", "porcentaje": 10.5 } ]
}
```

---

## Módulo 3: Medios de Pago

Antes de mostrar el checkout, obtener los medios habilitados para ese mayorista (ya filtrados por lo que el mayorista acepta y lo que el comercio tiene configurado).

```
GET /store/mayoristas/{mayorista_id}/medios-pago
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "medios_pago": [
    {
      "id": "mp_01JXXX",
      "nombre": "Transferencia Bancaria",
      "tipo": "transferencia",
      "icono": "🏦",
      "descripcion": "Transferir antes de la entrega",
      "porcentaje_costo": 0
    },
    {
      "id": "mp_02JXXX",
      "nombre": "Mercado Pago",
      "tipo": "online",
      "icono": "💳",
      "porcentaje_costo": 2.5
    }
  ]
}
```

`porcentaje_costo` → recargo que se agrega al total de la orden al elegir ese medio.

---

## Módulo 4: Órdenes de Compra

### Crear una orden

```
POST /store/ordenes
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "mayorista_id": "may_01JXXX",
  "items": [
    { "presentacion_id": "pmp_01JXXX", "cantidad": 3 },
    { "presentacion_id": "pmp_05JXXX", "cantidad": 10 }
  ],
  "medio_pago_id": "mp_01JXXX",
  "notas": "Entregar por la mañana",
  "transporte_id": null,
  "codigo_descuento_id": null
}
```

> **Regla crítica:** el comercio debe tener `solicitud.estado = "aceptado"` con el mayorista para poder crearle órdenes. Validar en el cliente antes de intentar el POST.

**Respuesta 201:**
```json
{
  "orden": {
    "id": "ord_01JXXX",
    "numero": 1042,
    "estado": "cargada",
    "total_neto": 24750.00,
    "total_iva": 2598.75,
    "total": 27348.75,
    "costo_medio_pago": 0,
    "notas": "Entregar por la mañana",
    "created_at": "2026-07-05T14:30:00Z",
    "items": [
      {
        "id": "oi_01JXXX",
        "nombre": "Aceite de Girasol — Bidón 5L",
        "ean": "7790040522014",
        "cantidad": 3,
        "precio_unitario": 8250.00,
        "alicuota_iva": 10.5,
        "unidad": "Bidón 5L",
        "subtotal_neto": 24750.00,
        "subtotal_iva": 2598.75,
        "subtotal": 27348.75
      }
    ]
  }
}
```

**Errores comunes:**
- `401` → token vencido o inválido
- `403` → comercio no aprobado en Nexo B2B
- `400` → falta mayorista_id, items vacíos, o presentacion_id no encontrado

### Listar mis órdenes

```
GET /store/ordenes
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "ordenes": [
    {
      "id": "ord_01JXXX",
      "numero": 1042,
      "estado": "despachada",
      "total": 27348.75,
      "mayorista_id": "may_01JXXX",
      "created_at": "2026-07-05T14:30:00Z",
      "items": [ ... ]
    }
  ]
}
```

Ordenadas por fecha descendente.

### Detalle de una orden

```
GET /store/ordenes/{id}
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "orden": {
    "id": "ord_01JXXX",
    "numero": 1042,
    "estado": "despachada",
    "total_neto": 24750.00,
    "total_iva": 2598.75,
    "total": 27348.75,
    "costo_medio_pago": 0,
    "medio_pago_nombre": "Transferencia Bancaria",
    "costo_transporte": 0,
    "transporte_nombre": null,
    "monto_descuento": 0,
    "notas": "Entregar por la mañana",
    "is_pagada": false,
    "is_facturada": false,
    "mayorista_id": "may_01JXXX",
    "mayorista_nombre": "Distribuidora El Sol",
    "created_at": "2026-07-05T14:30:00Z",
    "updated_at": "2026-07-06T09:00:00Z",
    "items": [ ... ]
  }
}
```

### Cancelar una orden

Solo se puede cancelar si `estado === "cargada"` y `is_facturada === false`.

```
PUT /store/ordenes/{id}/cancelar
Authorization: Bearer <token>
```

**Respuesta 200:** `{ "orden": { ...orden actualizada... } }`

**Error 400:** "Solo se puede cancelar un pedido cargado o devuelto"

---

## Estados de las órdenes

```
cargada → confirmada → en_preparacion → despachada → entregada
                                                    ↘ devuelto
cancelada  (solo desde "cargada" o "devuelto")
```

| Estado | Descripción |
|---|---|
| `cargada` | Recibida, el mayorista la ve pero no la confirmó |
| `confirmada` | El mayorista confirmó el pedido |
| `en_preparacion` | El mayorista está armando el pedido |
| `despachada` | En camino |
| `entregada` | Recibida por el comercio |
| `devuelto` | El comercio devolvió el pedido |
| `cancelada` | Cancelada (por comercio o mayorista) |

**Campos adicionales en el objeto orden:**
- `is_pagada: boolean` → el mayorista marcó el pago como recibido
- `is_facturada: boolean` → el mayorista subió la factura
- `envio_token: string | null` → token de seguimiento del envío (si hay transporte integrado)

---

## Reglas de negocio importantes

1. **El comercio DEBE tener `solicitud.estado === "aceptado"` con un mayorista para poder hacerle pedidos.** Si intentan crear una orden sin alta, el backend lo rechaza con 400.

2. **`tiene_alta: true` en una presentación** indica que el comercio puede comprar ese producto a ese mayorista. Presentaciones con `tiene_alta: false` se pueden mostrar pero no se puede generar una orden.

3. **Una orden es siempre con un solo mayorista.** Si el carrito tiene productos de dos mayoristas distintos, se generan dos órdenes separadas.

4. **El `presentacion_id` en los items** es el campo `id` del objeto dentro de `presentaciones[]` en la respuesta del catálogo (no el campo `presentacion_id` interno). Es el `id` de `producto_mayorista_presentacion`.

5. **Precio en factura = `total`** (ya incluye IVA + costo de medio de pago + costo de transporte - descuento). Los subcampos `total_neto`, `total_iva`, `costo_medio_pago`, etc. son para desglose.

---

## Flujo completo recomendado

```
1. INICIO DE SESIÓN
   POST /store/comercios/auth
   → Guardar token y comercio.id

2. CARGAR CATÁLOGOS BASE (una vez)
   GET /store/taxonomia
   → Guardar pasillos, rubros, subrubros

3. LISTAR MAYORISTAS CON ALTA
   GET /store/mayoristas/lista  (con JWT)
   → Filtrar donde solicitud.estado === "aceptado"
   → Estos son los que el usuario puede comprarle

4. MOSTRAR CATÁLOGO
   GET /api/v1/pos/productos?mayorista_id=XXX
   → Listar productos del mayorista elegido
   → Solo mostrar presentaciones con tiene_alta === true para habilitar compra

5. ARMAR CARRITO
   → Guardar localmente: { presentacion_id, cantidad, precio, nombre }
   → Un carrito por mayorista

6. CHECKOUT
   GET /store/mayoristas/{id}/medios-pago
   → Mostrar opciones de pago

   POST /store/ordenes
   Body: { mayorista_id, items: [{presentacion_id, cantidad}], medio_pago_id, notas }
   → Guardar id y numero de la orden creada

7. SEGUIMIENTO
   GET /store/ordenes
   → Listar todas las órdenes del comercio

   GET /store/ordenes/{id}
   → Detalle + estado actualizado de una orden

   PUT /store/ordenes/{id}/cancelar
   → Solo si estado === "cargada" y !is_facturada
```

---

## Manejo de errores

Todos los errores tienen formato:
```json
{ "error": "Descripción del error" }
```

| HTTP | Significado |
|---|---|
| `400` | Body inválido, campo faltante, regla de negocio no cumplida |
| `401` | Token faltante, inválido o expirado — pedir login nuevamente |
| `403` | Comercio suspendido o no aprobado |
| `404` | Recurso no encontrado o no pertenece a este comercio |
| `409` | Conflicto (ej: solicitud duplicada) |
| `500` | Error interno — mostrar mensaje genérico al usuario |

Cuando el response es `401`, limpiar el token guardado y redirigir al login.

---

## Notas de implementación

- **El token dura 30 días.** Implementar refresh al iniciar la app: si el token está próximo a vencer o falla con 401, pedir login.
- **Los precios vienen en pesos ARS** como número flotante. Usar formateo con separadores de miles.
- **`imagen_url`** puede ser null. Manejar con placeholder.
- **`stock`** puede ser null (mayorista no gestiona stock en el sistema). En ese caso mostrar como "disponible" sin número exacto.
- **Paginación:** los endpoints de catálogo devuelven hasta 100-200 resultados. Si se necesita más, usar filtros (q, pasillo_id, etc.) para navegar.
