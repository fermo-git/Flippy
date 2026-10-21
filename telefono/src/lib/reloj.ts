// Sincronización con el reloj: el reloj sube sus notas al proxy y aquí las traemos.
import { obtenerNotasReloj } from './api';
import { guardarNotaReloj, listarEntradas, quitarNotasRelojAusentes } from './db';
import { esDelReloj, normalizarEmocion } from './tipos';

let enCurso: Promise<boolean> | null = null;

/**
 * Trae las notas del reloj y las guarda en el teléfono.
 * Devuelve true si algo cambió (para que la pantalla se vuelva a leer).
 * Nunca lanza: si no hay internet o el proxy falla, simplemente no cambia nada.
 * Si ya hay una sincronización en marcha, reutiliza esa en vez de lanzar otra.
 */
export function sincronizarReloj(): Promise<boolean> {
  if (!enCurso) {
    enCurso = sincronizar().finally(() => {
      enCurso = null;
    });
  }
  return enCurso;
}

async function sincronizar(): Promise<boolean> {
  try {
    const notas = await obtenerNotasReloj();
    if (notas === null) return false; // modo demo

    const locales = new Map((await listarEntradas()).filter(esDelReloj).map((e) => [e.id, e]));
    let cambio = false;

    for (const n of notas) {
      const id = Number(n.id);
      const emocion = normalizarEmocion(n.emocion);
      const l = locales.get(id);
      const igual =
        l !== undefined &&
        l.fecha === n.fecha &&
        l.duracion === n.duracion &&
        l.resumen === n.resumen &&
        l.transcripcion === n.transcripcion &&
        l.emocion === emocion &&
        l.temas.join('|') === n.temas.join('|');
      if (!igual) {
        await guardarNotaReloj({ ...n, id });
        cambio = true;
      }
    }

    // Lo que se borró en el reloj también desaparece aquí.
    const borradas = await quitarNotasRelojAusentes(notas.map((n) => Number(n.id)));
    return cambio || borradas > 0;
  } catch (e) {
    console.warn('Sincronización con el reloj:', e instanceof Error ? e.message : e);
    return false;
  }
}
