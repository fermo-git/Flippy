import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = { texto: string; color: string };

/** Etiqueta redondeada con un puntito de color (emoción o tema). */
export function Chip({ texto, color }: Props) {
  return (
    <View style={[styles.chip, { borderColor: color + '66', backgroundColor: color + '1F' }]}>
      <View style={[styles.punto, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color }}>
        {texto}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
});
