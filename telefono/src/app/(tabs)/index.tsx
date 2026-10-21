import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntradaCard } from '@/components/entrada-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { useEntradas } from '@/hooks/use-entradas';
import { MODO_DEMO } from '@/lib/api';

export default function DiarioScreen() {
  const { entradas, cargando, sincronizar } = useEntradas();
  const [refrescando, setRefrescando] = useState(false);

  // Deslizar hacia abajo fuerza una sincronización con el reloj.
  const alRefrescar = async () => {
    setRefrescando(true);
    await sincronizar();
    setRefrescando(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.encabezado}>
          <ThemedText type="subtitle">Diario de voz</ThemedText>
          <ThemedText themeColor="textSecondary">
            {entradas.length === 0 ? 'Tu primera nota te espera' : `${entradas.length} notas`}
          </ThemedText>
          {MODO_DEMO && (
            <View style={styles.demo}>
              <ThemedText type="small" style={{ color: '#FFD166' }}>
                Modo demo · la transcripción y el análisis son simulados
              </ThemedText>
            </View>
          )}
        </View>

        <FlatList
          data={entradas}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => <EntradaCard entrada={item} />}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} tintColor={Colors.dark.acento} />
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListEmptyComponent={
            cargando ? null : (
              <View style={styles.vacio}>
                <ThemedText type="subtitle">🎙️</ThemedText>
                <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  Toca el botón y cuéntale a tu diario cómo te fue hoy.
                </ThemedText>
              </View>
            )
          }
        />

        <Pressable
          onPress={() => router.push('/grabar')}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Grabar nota de voz">
          <ThemedText type="smallBold" style={{ color: '#fff' }}>
            ● Grabar
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  encabezado: { paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.one },
  demo: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 999,
    backgroundColor: '#FFD16622',
  },
  lista: { paddingBottom: BottomTabInset + Spacing.six + Spacing.four, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: BottomTabInset + Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
    backgroundColor: Colors.dark.acento,
    shadowColor: Colors.dark.acento,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
