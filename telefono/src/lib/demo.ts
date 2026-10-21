// Modo demo: simula la transcripción y el análisis para probar la app SIN claves de API.
import { Analisis, normalizarAnalisis, quitarAcentos } from './tipos';

const TEXTOS = [
  'Hoy fue un día pesado en el trabajo. Mi jefe movió la fecha de entrega del proyecto y me siento muy estresado. Tengo que quedarme a terminar y casi no dormí anoche, estoy agotado.',
  'Salí a caminar con mi amiga después de clases y me reí muchísimo. Me siento feliz y muy agradecido de tener gente así cerca. Fue un día genial.',
  'Hablé con mi mamá por teléfono y la extraño bastante. Me quedé un rato triste, pero me hizo bien escucharla. Ojalá pueda visitarla pronto, a ella y a mi familia.',
  'Tengo examen mañana y estoy nervioso, no he estudiado lo suficiente. Voy a repasar toda la noche aunque tenga sueño. Espero que salga bien la escuela esta semana.',
  'Fue una tarde tranquila. Fui al gimnasio, cociné algo rico y me sentí en paz. Necesitaba un día de descanso así, sin prisa y sin pendientes.',
  'Estoy molesto por lo injusto que fue lo de hoy en la oficina. Me siento harto y frustrado, y encima tengo que pagar la renta esta semana y el dinero no alcanza.',
];

// Sin acentos a propósito: el texto se normaliza antes de comparar.
const EMOCION_PALABRAS: [string, string[]][] = [
  ['ansiedad', ['estres', 'nervios', 'preocup', 'ansios', 'examen', 'entrega']],
  ['enojo', ['molest', 'harto', 'frustr', 'injust', 'enojo']],
  ['tristeza', ['triste', 'extrano', 'llor', 'nostalg', 'solo']],
  ['cansancio', ['agotad', 'cansad', 'sueno', 'casi no dormi']],
  ['gratitud', ['agradec', 'gracias', 'afortunad']],
  ['alegria', ['feliz', 'contento', 'genial', 'rei', 'logre', 'alegre']],
  ['calma', ['tranquil', 'paz', 'relaj', 'descanso', 'calma']],
];

const TEMA_PALABRAS: [string, string[]][] = [
  ['trabajo', ['trabajo', 'jefe', 'oficina', 'proyecto', 'reunion']],
  ['estudios', ['escuela', 'examen', 'clases', 'estudi', 'tarea', 'universidad']],
  ['familia', ['mama', 'papa', 'familia', 'hermano', 'abuel']],
  ['amigos', ['amigo', 'amiga', 'fiesta', 'salimos']],
  ['salud', ['dormi', 'dormir', 'gimnasio', 'ejercicio', 'salud', 'medico']],
  ['dinero', ['dinero', 'pagar', 'renta', 'gasto', 'ahorr']],
  ['descanso', ['descanso', 'tranquil', 'vacacion', 'viaje']],
];

const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function transcribirDemo(): Promise<string> {
  await espera(1200);
  return TEXTOS[Math.floor(Math.random() * TEXTOS.length)];
}

export async function analizarDemo(texto: string): Promise<Analisis> {
  await espera(900);
  const t = quitarAcentos(texto.toLowerCase());

  // Emoción con más coincidencias (ganan las primeras de la lista en caso de empate).
  let mejor = 'otra';
  let puntos = 0;
  for (const [emocion, palabras] of EMOCION_PALABRAS) {
    const n = palabras.filter((p) => t.includes(p)).length;
    if (n > puntos) {
      puntos = n;
      mejor = emocion;
    }
  }

  const temas = TEMA_PALABRAS.filter(([, palabras]) => palabras.some((p) => t.includes(p)))
    .map(([tema]) => tema)
    .slice(0, 3);

  const primeraFrase = texto.split(/(?<=[.!?])\s+/)[0] ?? texto;
  return normalizarAnalisis({
    resumen: primeraFrase.length > 140 ? primeraFrase.slice(0, 137) + '…' : primeraFrase,
    emocion: mejor,
    temas,
  });
}
