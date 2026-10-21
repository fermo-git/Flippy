import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Constelacion } from '@/components/constelacion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, ColoresEmocion, Spacing } from '@/constants/theme';
import { useEntradas } from '@/hooks/use-entradas';
import { formatearFecha } from '@/lib/formato';

export default function ConstelacionScreen() {
  const { entradas } = useEntradas();
  const [tam, setTam] = useState({ ancho: 0, alto: 0 });
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);

  const listas = entradas.filter((e) => e.estado === 'listo');
  const seleccionada = listas.find((e) => e.id === seleccionadaId) ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.encabezado}>
          <ThemedText type="subtitle">Constelación</ThemedText>
          <ThemedText themeColor="textSecondary">
            Cada estrella es una nota. El color es la emoción; las líneas unen notas con un tema en común.
          </ThemedText>
        </View>

        <View
          style={styles.lienzo}
          onLayout={(e) =>
            setTam({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height })
          }>
          {listas.length === 0 ? (
            <View style={styles.vacio}>
              <ThemedText type="subtitle">✨</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Aún no hay estrellas. Graba tu primera nota en la pestaña Diario.
              </ThemedText>
            </View>
          ) : (
            tam.ancho > 0 && (
              <Constelacion
                entradas={listas}
                ancho={tam.ancho}
                alto={tam.alto}
                seleccionadaId={seleccionadaId}
                onSeleccionar={setSeleccionadaId}
              />
            )
          )}
        </View>

        {seleccionada && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/entrada/[id]', params: { id: String(seleccionada.id) } })
            }>
            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.filaTarjeta}>
                <ThemedText type="smallBold">{formatearFecha(seleccionada.fecha)}</ThemedText>
                <Chip texto={seleccionada.emocion} color={ColoresEmocion[seleccionada.emocion]} />
              </View>
              <ThemedText numberOfLines={2}>{seleccionada.resumen}</ThemedText>
              <ThemedText type="small" style={{ color: Colors.dark.acento }}>
                Abrir nota →
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset },
  encabezado: { paddingHorizontal: Spacing.one, paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.one },
  lienzo: { flex: 1, borderRadius: Spacing.three, overflow: 'hidden', backgroundColor: '#0B0B1C' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five },
  tarjeta: { marginTop: Spacing.three, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  filaTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
