// Prueba el proxy desde tu computadora, sin tocar el reloj.
// Uso:  node probar.mjs https://TU-URL.workers.dev TU-TOKEN [audio.m4a]
// Con audio: transcribe y luego analiza ESE texto (igual que hace el reloj).
import { readFile } from "node:fs/promises";

const [url, token = "", audio] = process.argv.slice(2);
if (!url) {
  console.log("Uso: node probar.mjs URL TOKEN [audio.m4a]");
  process.exitCode = 1;
} else {
  await main(url.replace(/\/$/, ""), token, audio);
}

async function main(base, token, audio) {
  const cab = token ? { "x-app-token": token } : {};
  let fallos = 0;
  let texto = "Hoy fue un día pesado en el trabajo, me siento muy estresado y casi no dormí.";

  if (audio) {
    try {
      const f = new FormData();
      f.append("file", new Blob([await readFile(audio)], { type: "audio/m4a" }), "nota.m4a");
      const r = await fetch(`${base}/transcribe`, { method: "POST", headers: cab, body: f });
      const d = await r.json();
      if (!r.ok) throw new Error(`${r.status} ${d.error}`);
      texto = d.texto;
      console.log("[OK] Transcripción (OpenAI):", texto);
    } catch (e) {
      fallos++;
      console.log("[FALLO] Transcripción:", e.message);
    }
  } else {
    console.log("(Sin audio: se analiza una frase de ejemplo. Pasa un .m4a como tercer argumento para probar la transcripción.)");
  }

  try {
    const r = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { ...cab, "content-type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${d.error}`);
    console.log("[OK] Análisis (OpenAI):", JSON.stringify(d));
  } catch (e) {
    fallos++;
    console.log("[FALLO] Análisis:", e.message);
  }

  process.exitCode = fallos ? 1 : 0; // sin process.exit(): evita el error de Windows
}
