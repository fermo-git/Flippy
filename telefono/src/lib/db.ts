// Base de datos local (SQLite). Todo se guarda en el teléfono.
import * as SQLite from 'expo-sqlite';

import { Analisis, Entrada, EstadoEntrada, normalizarEmocion } from './tipos';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrir() {
  const db = await SQLite.openDatabaseAsync('diario.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS entradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      audioUri TEXT NOT NULL,
      duracion REAL NOT NULL DEFAULT 0,
      transcripcion TEXT NOT NULL DEFAULT '',
      resumen TEXT NOT NULL DEFAULT '',
      emocion TEXT NOT NULL DEFAULT 'otra',
      temas TEXT NOT NULL DEFAULT '[]',
      estado TEXT NOT NULL DEFAULT 'pendiente',
      error TEXT
    );
  `);
  return db;
}

function getDB() {
  if (!dbPromise) dbPromise = abrir();
  return dbPromise;
}

type Fila = {
  id: number;
  fecha: string;
  audioUri: string;
  duracion: number;
  transcripcion: string;
  resumen: string;
  emocion: string;
  temas: string;
  estado: string;
  error: string | null;
};

function aEntrada(f: Fila): Entrada {
  let temas: string[] = [];
  try {
    const parsed: unknown = JSON.parse(f.temas);
    if (Array.isArray(parsed)) temas = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    temas = [];
  }
  return {
    id: f.id,
    fecha: f.fecha,
    audioUri: f.audioUri,
    duracion: f.duracion,
    transcripcion: f.transcripcion,
    resumen: f.resumen,
    emocion: normalizarEmocion(f.emocion),
    temas,
    estado: (['pendiente', 'listo', 'error'].includes(f.estado) ? f.estado : 'pendiente') as EstadoEntrada,
    error: f.error,
  };
}

/** Guarda una grabación nueva (aún sin transcribir). Devuelve su id. */
export async function crearEntrada(audioUri: string, duracion: number): Promise<number> {
  const db = await getDB();
  const r = await db.runAsync(
    `INSERT INTO entradas (fecha, audioUri, duracion, estado) VALUES (?, ?, ?, 'pendiente')`,
    [new Date().toISOString(), audioUri, duracion],
  );
  return r.lastInsertRowId;
}

export async function guardarTranscripcion(id: number, transcripcion: string) {
  const db = await getDB();
  await db.runAsync(`UPDATE entradas SET transcripcion = ? WHERE id = ?`, [transcripcion, id]);
}

export async function guardarAnalisis(id: number, a: Analisis) {
  const db = await getDB();
  await db.runAsync(
    `UPDATE entradas SET resumen = ?, emocion = ?, temas = ?, estado = 'listo', error = NULL WHERE id = ?`,
    [a.resumen, a.emocion, JSON.stringify(a.temas), id],
  );
}

export async function marcarError(id: number, mensaje: string) {
  const db = await getDB();
  await db.runAsync(`UPDATE entradas SET estado = 'error', error = ? WHERE id = ?`, [mensaje, id]);
}

export async function listarEntradas(): Promise<Entrada[]> {
  const db = await getDB();
  const filas = await db.getAllAsync<Fila>(`SELECT * FROM entradas ORDER BY fecha DESC`);
  return filas.map(aEntrada);
}

export async function obtenerEntrada(id: number): Promise<Entrada | null> {
  const db = await getDB();
  const fila = await db.getFirstAsync<Fila>(`SELECT * FROM entradas WHERE id = ?`, [id]);
  return fila ? aEntrada(fila) : null;
}

export async function borrarEntrada(id: number) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM entradas WHERE id = ?`, [id]);
}

/**
 * Guarda (o actualiza) una nota que llegó del reloj. Reutiliza el id del reloj, así que
 * sincronizar varias veces nunca la duplica. No tiene audio: audioUri queda vacío.
 */
export async function guardarNotaReloj(n: {
  id: number;
  fecha: string;
  duracion: number;
  transcripcion: string;
  resumen: string;
  emocion: string;
  temas: string[];
}) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO entradas (id, fecha, audioUri, duracion, transcripcion, resumen, emocion, temas, estado, error)
     VALUES (?, ?, '', ?, ?, ?, ?, ?, 'listo', NULL)`,
    [n.id, n.fecha, n.duracion, n.transcripcion, n.resumen, normalizarEmocion(n.emocion), JSON.stringify(n.temas)],
  );
}

/** Borra las notas del reloj cuyo id ya no está en la lista vigente. Devuelve cuántas borró. */
export async function quitarNotasRelojAusentes(idsVigentes: number[]): Promise<number> {
  const db = await getDB();
  const filas = await db.getAllAsync<{ id: number }>(`SELECT id FROM entradas WHERE audioUri = ''`);
  const vigentes = new Set(idsVigentes);
  const sobran = filas.filter((f) => !vigentes.has(f.id));
  for (const f of sobran) {
    await db.runAsync(`DELETE FROM entradas WHERE id = ?`, [f.id]);
  }
  return sobran.length;
}
