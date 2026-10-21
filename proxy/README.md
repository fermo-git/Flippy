# Proxy del Diario de Voz (OpenAI + Cloudflare)

El reloj envía el audio a este proxy; el proxy llama a OpenAI con tu clave. Hace dos cosas:

- `/transcribe`: audio a texto con `whisper-1`.
- `/analyze`: texto a resumen, emoción y temas con `gpt-5.4-mini`.

Costo estimado de todo el proyecto: unos centavos de dólar. Tú pones el saldo ($5 es el mínimo habitual).

---

## Paso 1. Cuenta y clave de OpenAI (10 min)

1. Entra a https://platform.openai.com y crea una cuenta o inicia sesión. **Es distinta de ChatGPT Plus**: la API se paga aparte.
2. **Billing**: agrega una tarjeta y compra crédito prepagado (normalmente $5 como mínimo; confirma el monto en pantalla).
3. En **Billing → Limits**, fija un **límite mensual de gasto** (por ejemplo $5). Es tu protección si alguien encuentra tu URL.
4. En **API keys → Create new secret key**, ponle nombre `diario-voz` y cópiala a un bloc de notas. Empieza con `sk-`. Solo se muestra una vez.

> No pegues la clave en chats, capturas ni en el código del reloj.

## Paso 2. Cuenta de Cloudflare (5 min)

1. Entra a https://dash.cloudflare.com/sign-up y crea la cuenta gratuita con tu correo.
2. Confirma tu correo. No necesitas agregar un dominio ni tarjeta para Workers.

## Paso 3. Preparar la computadora (5 min)

Abre **PowerShell** y comprueba que tienes Node.js 20 o superior:

```powershell
node --version
```

Si no existe, instala la versión LTS desde https://nodejs.org y abre PowerShell de nuevo.

Si PowerShell dice que `npx.ps1` no se puede cargar porque la ejecución de scripts está deshabilitada, usa `npx.cmd` en lugar de `npx` en todos los comandos de abajo.

## Paso 4. Desplegar el proxy (5 min)

Descomprime esta carpeta, entra en ella desde PowerShell y ejecuta:

```powershell
cd ruta\a\diario-proxy
npx wrangler login
```

Se abre el navegador: inicia sesión en Cloudflare y pulsa **Allow**. Después:

```powershell
npx wrangler deploy
```

La primera vez puede preguntar por tu subdominio `workers.dev`: acepta o elige un nombre. Al terminar muestra tu URL:

```
https://diario-voz-proxy.TU-USUARIO.workers.dev
```

Cópiala.

## Paso 5. Guardar los secretos (3 min)

```powershell
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_TOKEN
```

- En el primero pega tu clave `sk-...` (no se ve al pegar; es normal) y pulsa Enter.
- En el segundo inventa una frase larga, por ejemplo `luna-azul-cometa-4471`. Es la contraseña entre el reloj y el proxy.

Los secretos se aplican de inmediato, no hace falta volver a desplegar.

## Paso 6. Probar el proxy (2 min)

```powershell
node probar.mjs https://TU-URL.workers.dev luna-azul-cometa-4471
```

Debe mostrar `[OK] Análisis (OpenAI): {"resumen":...}`.

Para probar también la transcripción, graba una nota corta con cualquier app de grabadora, guárdala como `.m4a` y ejecuta:

```powershell
node probar.mjs https://TU-URL.workers.dev luna-azul-cometa-4471 C:\ruta\nota.m4a
```

## Paso 7. Conectar el reloj (2 min)

Abre `Config.kt` en Android Studio y pon tu URL y tu frase (el mismo `APP_TOKEN`):

```kotlin
const val API_URL = "https://diario-voz-proxy.TU-USUARIO.workers.dev"
const val API_TOKEN = "luna-azul-cometa-4471"
```

Ejecuta con ▶. Graba una nota: en modo real la transcripción es lo que dijiste, no una de las seis frases de ejemplo.

---

## Sincronizar con la app del teléfono (una sola vez)

El reloj sube cada nota al proxy y la app del teléfono las descarga de ahí. No hace falta emparejar nada por Bluetooth, y funciona igual en emuladores y en dispositivos reales.

**Atajo (recomendado):** en la carpeta principal del proxy (donde está `wrangler.toml`, no dentro de `src`) ejecuta un solo comando con tu token. Hace los pasos 1 a 4 de abajo: crea el almacén, pega su id, despliega y comprueba que responde.

```powershell
node actualizar.mjs TU-TOKEN
```

Si prefieres hacerlo a mano:

1. Crea el almacén (en la carpeta principal del proxy, la que contiene `wrangler.toml`; **no dentro de `src`**):

   ```powershell
   npx wrangler kv namespace create NOTAS
   ```

   Imprime un bloque con un `id` largo, algo como `id = "a1b2c3..."`. Si tu versión de wrangler no reconoce ese comando, prueba `npx wrangler kv:namespace create NOTAS`.

2. Abre `wrangler.toml`, busca `id = "PEGA_AQUI_EL_ID"` y reemplaza solo el texto entre comillas por ese `id`. Si lo dejas sin cambiar, el despliegue falla.

3. Vuelve a desplegar:

   ```powershell
   npx wrangler deploy
   ```

4. Comprueba que responde (usa tu URL y tu token):

   ```powershell
   curl.exe -H "x-app-token: TU-TOKEN" https://TU-URL.workers.dev/notes
   ```

   Debe mostrar `{"notas":[]}` si aún no hay notas.

5. Graba una nota en el reloj, espera unos segundos y repite el comando del paso 4: debe aparecer.

Notas:
- El almacén KV es de consistencia eventual: una nota nueva puede tardar hasta un minuto en verse desde otra red o ubicación. En pruebas locales suele ser inmediato.
- Se conservan las últimas 200 notas. Solo se sincroniza el texto (transcripción, resumen, emoción y temas), no el audio.
- Si el reloj no tenía internet al grabar, reenvía las notas pendientes la próxima vez que abras la app.
- Borrar una nota en el reloj también la borra del proxy.

---

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `[FALLO] 401 Token inválido` | El token no coincide | Repite `wrangler secret put APP_TOKEN` y usa exactamente la misma frase en la prueba y en `Config.kt` |
| `502 La clave de OpenAI no es válida` | Clave mal copiada | Repite `wrangler secret put OPENAI_API_KEY` |
| `502 ... sin saldo o límite alcanzado` | Sin crédito o límite mensual bajo | Revisa Billing en platform.openai.com |
| `500 Falta el secreto OPENAI_API_KEY` | No guardaste el secreto | Paso 5 |
| `502 OpenAI no aceptó el audio` | Audio dañado o formato raro | Ver el error real con `npx wrangler tail` |
| `500 Falta crear el almacén KV` | No hiciste la sincronización | Sección "Sincronizar con la app del teléfono" |
| El reloj dice "No se pudo conectar" | URL mal escrita en `Config.kt` o emulador sin internet | Abre la URL en el navegador: debe mostrar `{"ok":true,...}` |
| `wrangler` no reconocido | Node.js no instalado | Paso 3 |

Para ver lo que pasa en el servidor mientras grabas, abre otra PowerShell en esta carpeta y ejecuta `npx wrangler tail`.

## Cambiar de modelo (opcional)

Sin tocar el código, desde `wrangler.toml`, añade una sección:

```toml
[vars]
ANALYZE_MODEL = "gpt-5.4-nano"      # más barato
TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"
```

y vuelve a ejecutar `npx wrangler deploy`.
