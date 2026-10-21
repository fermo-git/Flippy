import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listarEntradas } from '@/lib/db';
import { sincronizarReloj } from '@/lib/reloj';
import { Entrada } from '@/lib/tipos';

const CADA_MS = 15_000;

/**
 * Carga las entradas, las vuelve a leer cada vez que la pantalla recupera el foco
 * y, mientras está visible, trae las notas del reloj cada 15 segundos.
 */
export function useEntradas() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [cargando, setCargando] = useState(true);

  const leer = useCallback(async () => {
    setEntradas(await listarEntradas());
  }, []);

  const recargar = useCallback(async () => {
    try {
      await leer();
    } finally {
      setCargando(false);
    }
  }, [leer]);

  /** Trae las notas del reloj y, si hubo cambios, vuelve a leer la lista. */
  const sincronizar = useCallback(async () => {
    if (await sincronizarReloj()) await leer();
  }, [leer]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      recargar().then(() => {
        if (activo) sincronizar();
      });
      const timer = setInterval(sincronizar, CADA_MS);
      return () => {
        activo = false;
        clearInterval(timer);
      };
    }, [recargar, sincronizar]),
  );

  return { entradas, cargando, recargar, sincronizar };
}
