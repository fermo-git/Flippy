// Prepara y despliega el proxy en un solo paso:
//   1) crea el almacén KV (si falta) y pega su id en wrangler.toml
//   2) despliega con wrangler
//   3) comprueba que GET /notes responde
//
// Uso (dentro de la carpeta del proxy, ya con `npx wrangler login` hecho):
//   node actualizar.mjs TU-TOKEN
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const token = process.argv[2] ?? "";
const TOML = "wrangler.toml";
const PLACEHOLDER = "PEGA_AQUI_EL_ID";

function wrangler(args) {
  const r = spawnSync("npx", ["wrangler", ...args], { encoding: "utf8", shell: true });
  return { ok: r.status === 0, salida: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

const paso = (t) => console.log(`\n== ${t}`);
const salir = (t) => {
  console.log(`\n[X] ${t}`);
  process.exit(1);
};

let toml = readFileSync(TOML, "utf8");
if (!/\[\[kv_namespaces\]\]/.test(toml)) {
  salir("Tu wrangler.toml no tiene la sección [[kv_namespaces]]. Usa el wrangler.toml del zip nuevo.");
}

// ---- 1) Almacén KV ----
if (toml.includes(PLACEHOLDER)) {
  paso("Creando el almacén KV (NOTAS)");
  let id = null;

  const crear = wrangler(["kv", "namespace", "create", "NOTAS"]);
  const hex = crear.salida.match(/\b[0-9a-f]{32}\b/);
  if (crear.ok && hex) {
    id = hex[0];
  } else {
    // Quizá ya existe de un intento anterior: lo buscamos en la lista.
    console.log("No se pudo crear (¿ya existe?). Buscándolo en tu cuenta...");
    const lista = wrangler(["kv", "namespace", "list"]);
    try {
      const json = JSON.parse(lista.salida.slice(lista.salida.indexOf("[")));
      id = json.find((n) => /NOTAS$/i.test(n.title))?.id ?? null;
    } catch {
      /* se informa abajo */
    }
  }

  if (!id) {
    console.log(crear.salida.trim());
    salir("No pude obtener el id del almacén. ¿Hiciste `npx wrangler login`? Copia el mensaje de arriba.");
  }
  toml = toml.replace(PLACEHOLDER, id);
  writeFileSync(TOML, toml);
  console.log(`[OK] id guardado en wrangler.toml (${id.slice(0, 6)}...)`);
} else {
  paso("El almacén KV ya estaba configurado en wrangler.toml");
}

// ---- 2) Despliegue ----
paso("Desplegando el proxy");
const deploy = wrangler(["deploy"]);
console.log(deploy.salida.trim());
if (!deploy.ok) salir("El despliegue falló. Lee el mensaje de arriba.");
const url = deploy.salida.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0];
if (!url) salir("Se desplegó, pero no encontré la URL en la salida. Búscala en el panel de Cloudflare.");
console.log(`\n[OK] URL del proxy: ${url}`);

// ---- 3) Comprobación ----
paso("Comprobando GET /notes");
let comprobado = false;
if (!token) {
  console.log("(Sin token: no se comprueba. Ejecuta `node actualizar.mjs TU-TOKEN` para probar también eso.)");
  comprobado = true; // no hay nada que haya fallado
} else {
  try {
    const r = await fetch(`${url}/notes`, { headers: { "x-app-token": token } });
    const texto = await r.text();
    if (r.ok) {
      console.log(`[OK] El proxy responde: ${texto.slice(0, 120)}`);
      comprobado = true;
    } else if (r.status === 401) {
      console.log("[X] Respondió 401: el token no coincide con el APP_TOKEN guardado en Cloudflare.");
    } else {
      console.log(`[X] Respondió ${r.status}: ${texto.slice(0, 200)}`);
    }
  } catch (e) {
    console.log(`[X] No se pudo conectar (${e.cause?.code ?? e.message}). Si acabas de desplegar, espera 30 s y repite.`);
  }
}

if (comprobado) {
  console.log("\nListo. Pon esa URL en Config.kt (reloj) y en .env.local (React).");
} else {
  console.log(`\nEl proxy quedó desplegado en ${url}, pero la comprobación falló. Revisa el mensaje de arriba.`);
  process.exitCode = 1;
}
