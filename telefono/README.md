# Diario de Voz

App móvil (Expo SDK 57 + React Native) para grabar notas de voz. Cada nota se transcribe,
se resume con IA, se etiqueta con una emoción y temas, y aparece como una estrella en una
**constelación** de tus días. Todo se guarda localmente en el teléfono (SQLite).

## Qué hace hoy

- Grabar notas (máx. 2 min) con medidor de volumen animado.
- Transcribir → resumir → detectar emoción y temas.
- Lista de notas, detalle con reproductor, transcripción y borrado.
- Constelación: eje horizontal = tiempo, banda vertical = emoción, líneas = temas compartidos.
- Reintento si falla la red o la IA (la grabación nunca se pierde).
- **Modo demo**: sin claves, la transcripción y el análisis son simulados.

## Requisitos

- Node.js 20 o superior y npm
- Un teléfono Android/iPhone con la app **Expo Go**, o Android Studio con un emulador
- (Opcional, para IA real) cuenta de OpenAI y de Anthropic, y una cuenta gratuita de Cloudflare

## Ejecutar

```bash
npm install
npx expo start
```

- Teléfono: abre Expo Go y escanea el QR (teléfono y computadora en la misma red Wi-Fi).
- Emulador Android: con el emulador abierto, pulsa `a` en la terminal.

## Activar la IA real

1. `cd proxy` y despliega el proxy (ver abajo).
2. Copia `.env.example` como `.env.local` y pon la URL de tu proxy en `EXPO_PUBLIC_API_URL`.
3. Reinicia con `npx expo start -c`.

### Desplegar el proxy (Cloudflare Workers)

```bash
cd proxy
npx wrangler login
npx wrangler secret put OPENAI_API_KEY      # transcripción (Whisper)
npx wrangler secret put ANTHROPIC_API_KEY   # resumen y análisis (Claude)
npx wrangler secret put APP_TOKEN           # opcional: una palabra larga cualquiera
npx wrangler deploy
```

Wrangler imprime una URL tipo `https://diario-voz-proxy.<tu-usuario>.workers.dev`.
Si usas `APP_TOKEN`, ponlo también en `EXPO_PUBLIC_API_TOKEN`.

Modelos configurables como variables del Worker: `TRANSCRIBE_MODEL` (por defecto `whisper-1`)
y `ANALYSIS_MODEL` (por defecto `claude-haiku-5-5`). Si cambias a otro modelo, revisa en la
documentación de Anthropic si requiere ajustar `thinking` o `effort`.

> Las claves viven SOLO en el proxy. Las variables `EXPO_PUBLIC_*` se incluyen dentro de la app
> y cualquiera podría leerlas, por eso `APP_TOKEN` es solo una barrera ligera.

## Estructura

```
src/app/
  _layout.tsx            navegación raíz (Stack)
  (tabs)/index.tsx       pestaña Diario (lista)
  (tabs)/constelacion.tsx pestaña Constelación
  grabar.tsx             pantalla de grabación (modal)
  entrada/[id].tsx       detalle de una nota
src/lib/
  tipos.ts               tipos y validación de la respuesta de la IA
  db.ts                  SQLite
  api.ts / demo.ts       llamadas al proxy / modo demo
  procesar.ts            flujo audio → texto → análisis → guardado
  constelacion.ts        cálculo de posiciones de las estrellas
src/components/          chip, tarjeta de entrada, constelación (SVG)
proxy/                   Cloudflare Worker que guarda tus claves
```

## Comandos útiles

```bash
npx tsc --noEmit      # revisar tipos
npx expo-doctor       # diagnosticar dependencias
npx expo install --fix  # corregir versiones incompatibles
```

## Privacidad

El audio y su transcripción se envían a OpenAI y a Anthropic (vía tu proxy) para procesarse.
Avísalo a quien use la app. Los datos guardados quedan solo en el teléfono.
