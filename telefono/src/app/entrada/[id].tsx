import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, ColoresEmocion, Spacing } from '@/constants/theme';
import { borrarEntrada, obtenerEntrada } from '@/lib/db';
import { formatearDuracion, formatearFecha, formatearHora } from '@/lib/formato';
import { procesarEntrada } from '@/lib/procesar';
import { Entrada, esDelReloj } from '@/lib/tipos';

export default function DetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reintentando, setReintentando] = useState(false);

  const cargar = useCallback(async () => {
    const e = await obtenerEntrada(Number(id));
    setEntrada(e);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reintentar = async () => {
    if (!entrada) return;
    setReintentando(true);
    await procesarEntrada(entrada);
    await cargar();
    setReintentando(false);
  };

  const borrar = () => {
    Alert.alert('¿Borrar esta nota?', 'Se elimina el texto y el audio de tu diario.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await borrarEntrada(Number(id));
          router.back();
        },
      },
    ]);
  };

  if (cargando) {
    return (
      <ThemedView style={styles.centro}>
        <ActivityIndicator color={Colors.dark.acento} />
      </ThemedView>
    );
  }

  if (!entrada) {
    return (
      <ThemedView style={styles.centro}>
        <ThemedText themeColor="textSecondary">Esta nota ya no existe.</ThemedText>
      </ThemedView>
    );
  }

  const color = ColoresEmocion[entrada.emocion];
  const listo = entrada.estado === 'listo';
  const delReloj = esDelReloj(entrada);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={{ gap: Spacing.one }}>
            <ThemedText type="subtitle">{formatearFecha(entrada.fecha)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {formatearHora(entrada.fecha)} · {formatearDuracion(entrada.duracion)}
              {delReloj ? ' · grabada en el reloj' : ''}
            </ThemedText>
          </View>

          {listo ? (
            <>
              <View style={styles.chips}>
                <Chip texto={entrada.emocion} color={color} />
                {entrada.temas.map((t) => (
                  <Chip key={t} texto={t} color="#9A9CB8" />
                ))}
              </View>
              <ThemedView type="backgroundElement" style={[styles.bloque, { borderLeftColor: color, borderLeftWidth: 3 }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  RESUMEN
                </ThemedText>
                <ThemedText>{entrada.resumen}</ThemedText>
              </ThemedView>
            </>
          ) : (
            <ThemedView type="backgroundElement" style={styles.bloque}>
              <ThemedText type="smallBold">
                {entrada.estado === 'error' ? 'No se pudo procesar la nota' : 'Nota sin procesar'}
              </ThemedText>
              {entrada.error && <ThemedText themeColor="textSecondary">{entrada.error}</ThemedText>}
              <Pressable
                onPress={reintentar}
                disabled={reintentando}
                style={({ pressed }) => [styles.boton, (pressed || reintentando) && { opacity: 0.7 }]}>
                {reintentando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
                    Reintentar
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
          )}

          {!delReloj && <Reproductor uri={entrada.audioUri} />}

          {entrada.transcripcion.trim() !== '' && (
            <ThemedView type="backgroundElement" style={styles.bloque}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                TRANSCRIPCIÓN
              </ThemedText>
              <ThemedText>{entrada.transcripcion}</ThemedText>
            </ThemedView>
          )}

          {delReloj ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.avisoReloj}>
              Esta nota se grabó en el reloj; para borrarla, hazlo desde el reloj.
            </ThemedText>
          ) : (
            <Pressable onPress={borrar} style={styles.borrar} hitSlop={8}>
              <ThemedText type="small" style={{ color: '#FF5A5F' }}>
                Borrar nota
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Reproductor({ uri }: { uri: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const progreso = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  const alternar = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // Si ya terminó, vuelve al inicio.
    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) player.seekTo(0);
    player.play();
  };

  return (
    <ThemedView type="backgroundElement" style={[styles.bloque, styles.reproductor]}>
      <Pressable onPress={alternar} style={styles.play} accessibilityLabel={status.playing ? 'Pausar' : 'Reproducir'}>
        <ThemedText style={{ color: '#fff' }}>{status.playing ? '❚❚' : '▶'}</ThemedText>
      </Pressable>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <View style={styles.pista}>
          <View style={[styles.relleno, { width: `${progreso * 100}%` }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {formatearDuracion(status.currentTime)} / {formatearDuracion(status.duration)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, paddingTop: Spacing.six + Spacing.four, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bloque: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  reproductor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.acento,
  },
  pista: { height: 4, borderRadius: 2, backgroundColor: Colors.dark.borde, overflow: 'hidden' },
  relleno: { height: 4, backgroundColor: Colors.dark.acento },
  boton: {
    alignSelf: 'flex-start',
    minWidth: 110,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    backgroundColor: Colors.dark.acento,
  },
  borrar: { alignSelf: 'center', paddingVertical: Spacing.three },
  avisoReloj: { textAlign: 'center', paddingVertical: Spacing.three },
});
