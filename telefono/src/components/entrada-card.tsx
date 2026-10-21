import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ColoresEmocion, Spacing } from '@/constants/theme';
import { formatearDuracion, formatearFecha, formatearHora } from '@/lib/formato';
import { Entrada, esDelReloj } from '@/lib/tipos';

export function EntradaCard({ entrada }: { entrada: Entrada }) {
  const color = ColoresEmocion[entrada.emocion];
  const listo = entrada.estado === 'listo';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/entrada/[id]', params: { id: String(entrada.id) } })}
      style={({ pressed }) => pressed && styles.presionado}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={[styles.barra, { backgroundColor: listo ? color : '#555' }]} />
        <View style={styles.contenido}>
          <View style={styles.fila}>
            <ThemedText type="smallBold">{formatearFecha(entrada.fecha)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatearHora(entrada.fecha)} · {formatearDuracion(entrada.duracion)}
            </ThemedText>
          </View>

          {listo ? (
            <>
              <ThemedText numberOfLines={3}>{entrada.resumen}</ThemedText>
              <View style={styles.chips}>
                <Chip texto={entrada.emocion} color={color} />
                {esDelReloj(entrada) && <Chip texto="reloj" color="#7C8CFF" />}
                {entrada.temas.slice(0, 2).map((t) => (
                  <Chip key={t} texto={t} color="#9A9CB8" />
                ))}
              </View>
            </>
          ) : (
            <ThemedText themeColor="textSecondary">
              {entrada.estado === 'error'
                ? 'No se pudo procesar. Toca para reintentar.'
                : 'Procesando…'}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  presionado: { opacity: 0.75 },
  card: { flexDirection: 'row', borderRadius: Spacing.three, overflow: 'hidden' },
  barra: { width: 4 },
  contenido: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
