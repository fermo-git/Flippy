// Calcula dónde dibujar cada estrella y qué estrellas se conectan.
//   · Eje X  → orden cronológico (izquierda = más antigua)
//   · Eje Y  → una "banda" por emoción
//   · Línea  → dos entradas consecutivas que comparten un tema
import { EMOCIONES, Entrada } from './tipos';

export type Estrella = {
  id: number;
  x: number;
  y: number;
  radio: number;
  emocion: Entrada['emocion'];
  fase: number; // 0..1, para que cada estrella titile distinto
  entrada: Entrada;
};

export type Enlace = { clave: string; a: Estrella; b: Estrella; tema: string };

// Generador pseudoaleatorio determinista: la misma entrada siempre cae en el mismo lugar.
function semilla(n: number) {
  let t = (n * 2654435761) >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function calcularConstelacion(entradas: Entrada[], ancho: number, alto: number, margen = 36) {
  const listas = entradas
    .filter((e) => e.estado === 'listo')
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const n = listas.length;
  const altoBanda = (alto - margen * 2) / EMOCIONES.length;

  const estrellas: Estrella[] = listas.map((entrada, i) => {
    const azar = semilla(entrada.id);
    const progreso = n === 1 ? 0.5 : i / (n - 1);
    const x = margen + progreso * (ancho - margen * 2) + (azar() - 0.5) * 16;
    const banda = EMOCIONES.indexOf(entrada.emocion);
    const y = margen + (banda + 0.5) * altoBanda + (azar() - 0.5) * altoBanda * 0.5;
    const radio = 4 + Math.min(entrada.duracion / 60, 1) * 4; // notas largas = estrellas más grandes
    return { id: entrada.id, x, y, radio, emocion: entrada.emocion, fase: azar(), entrada };
  });

  const enlaces: Enlace[] = [];
  const vistos = new Set<string>();
  const porTema = new Map<string, Estrella[]>();
  for (const e of estrellas) {
    for (const tema of e.entrada.temas) {
      const lista = porTema.get(tema) ?? [];
      lista.push(e);
      porTema.set(tema, lista);
    }
  }
  for (const [tema, lista] of porTema) {
    for (let i = 0; i < lista.length - 1; i++) {
      const a = lista[i];
      const b = lista[i + 1];
      const clave = `${a.id}-${b.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      enlaces.push({ clave, a, b, tema });
    }
  }

  return { estrellas, enlaces, altoBanda, margen };
}
