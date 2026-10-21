import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { crearEntrada } from '@/lib/db';
import { formatearDuracion } from '@/lib/formato';
import { procesarEntrada } from '@/lib/procesar';

const MAX_SEGUNDOS = 120; // límite por nota (controla costos)
const MIN_SEGUNDOS = 2;

type Fase = 'inicio' | 'grabando' | 'procesando';

export default function GrabarScreen() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document', // el audio se conserva (no en caché)
    isMeteringEnabled: true,
  });
  const estado = useAudioRecorderState(recorder, 100);

  const [fase, setFase] = useState<Fase>('inicio');
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const ocupado = useRef(false);

  // Pulso del botón según el volumen de tu voz.
  const escala = useSharedValue(1);
  const aro = useSharedValue(0);

  // Devuelve true si hay permiso. Nunca lanza: en Android, pedirlo mientras el modal
  // aún se anima puede fallar; en ese caso se vuelve a pedir al tocar "Grabar".
  const pedirPermiso = useCallback(async (): Promise<boolean> => {
    try {
      const r = await AudioModule.requestRecordingPermissionsAsync();
      setPermiso(r.granted);
      if (r.granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
      return r.granted;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      pedirPermiso();
    }, 400); // esperamos a que termine la animación del modal
    return () => clearTimeout(timer);
  }, [pedirPermiso]);

  useEffect(() => {
    if (fase !== 'grabando') {
      escala.value = withTiming(1, { duration: 200 });
      aro.value = 0;
      return;
    }
    // metering viene en decibeles (≈ -60 silencio … 0 muy fuerte). Si no existe, pulso suave.
    const db = estado.metering;
    const nivel = typeof db === 'number' ? Math.min(Math.max((db + 60) / 60, 0), 1) : 0.15;
    escala.value = withTiming(1 + nivel * 0.3, { duration: 120 });
  }, [estado.metering, fase, escala, aro]);

  useEffect(() => {
    if (fase === 'grabando') {
      aro.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    }
  }, [fase, aro]);

  const estiloBoton = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const estiloAro = useAnimatedStyle(() => ({
    opacity: (1 - aro.value) * 0.5,
    transform: [{ scale: 1 + aro.value * 0.9 }],
  }));

  const iniciar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      if (permiso !== true && !(await pedirPermiso())) {
        Alert.alert(
          'Sin acceso al micrófono',
          'Activa el permiso del micrófono para esta app en los ajustes del teléfono.',
        );
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setFase('grabando');
    } catch (e) {
      Alert.alert('No se pudo grabar', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      ocupado.current = false;
    }
  };

  const detener = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    const segundos = estado.durationMillis / 1000;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || segundos < MIN_SEGUNDOS) {
        Alert.alert('Nota muy corta', 'Habla al menos un par de segundos.');
        setFase('inicio');
        return;
      }
      setFase('procesando');
      const id = await crearEntrada(uri, segundos);
      // Si falla, la entrada queda en "error" y se puede reintentar desde su detalle.
      await procesarEntrada({ id, audioUri: uri, transcripcion: '' });
      router.replace({ pathname: '/entrada/[id]', params: { id: String(id) } });
    } catch (e) {
      Alert.alert('Algo salió mal', e instanceof Error ? e.message : 'Error desconocido');
      setFase('inicio');
    } finally {
      ocupado.current = false;
    }
  }, [estado.durationMillis, recorder]);

  // Corta automáticamente al llegar al máximo.
  useEffect(() => {
    if (fase === 'grabando' && estado.durationMillis / 1000 >= MAX_SEGUNDOS) detener();
  }, [estado.durationMillis, fase, detener]);

  const cancelar = async () => {
    if (fase === 'grabando') {
      try {
        await recorder.stop();
      } catch {
        // ya estaba detenida
      }
    }
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.arriba}>
          {fase !== 'procesando' && (
            <Pressable onPress={cancelar} hitSlop={12}>
              <ThemedText themeColor="textSecondary">Cancelar</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.centro}>
          {permiso === false ? (
            <ThemedText style={{ textAlign: 'center' }} themeColor="textSecondary">
              Necesito acceso al micrófono. Actívalo en los ajustes de tu teléfono para esta app.
            </ThemedText>
          ) : fase === 'procesando' ? (
            <>
              <ActivityIndicator size="large" color={Colors.dark.acento} />
              <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                Escuchando tu nota…
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Transcribiendo y analizando. Puede tardar unos segundos.
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="title" style={styles.tiempo}>
                {formatearDuracion(fase === 'grabando' ? estado.durationMillis / 1000 : 0)}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {fase === 'grabando'
                  ? `Habla con calma · máx. ${formatearDuracion(MAX_SEGUNDOS)}`
                  : 'Toca para empezar a grabar'}
              </ThemedText>

              <View style={styles.zonaBoton}>
                <Animated.View style={[styles.aro, estiloAro]} />
                <Animated.View style={estiloBoton}>
                  <Pressable
                    onPress={fase === 'grabando' ? detener : iniciar}
                    accessibilityLabel={fase === 'grabando' ? 'Detener grabación' : 'Empezar a grabar'}
                    style={[styles.boton, fase === 'grabando' && styles.botonGrabando]}>
                    <View style={fase === 'grabando' ? styles.cuadro : styles.punto} />
                  </Pressable>
                </Animated.View>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {fase === 'grabando' ? 'Toca de nuevo para terminar' : ' '}
              </ThemedText>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const TAM = 120;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  arriba: { height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  tiempo: { fontVariant: ['tabular-nums'] },
  zonaBoton: { width: TAM * 2, height: TAM * 2, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.five },
  aro: {
    position: 'absolute',
    width: TAM,
    height: TAM,
    borderRadius: TAM / 2,
    backgroundColor: '#FF5A5F',
  },
  boton: {
    width: TAM,
    height: TAM,
    borderRadius: TAM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.acento,
    shadowColor: Colors.dark.acento,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  botonGrabando: { backgroundColor: '#FF5A5F', shadowColor: '#FF5A5F' },
  punto: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff' },
  cuadro: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#fff' },
});
