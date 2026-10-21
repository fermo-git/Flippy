import { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { Colors, ColoresEmocion } from '@/constants/theme';
import { Estrella, calcularConstelacion } from '@/lib/constelacion';
import { EMOCIONES, Entrada } from '@/lib/tipos';

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

type Props = {
  entradas: Entrada[];
  ancho: number;
  alto: number;
  seleccionadaId: number | null;
  onSeleccionar: (id: number) => void;
};

export function Constelacion({ entradas, ancho, alto, seleccionadaId, onSeleccionar }: Props) {
  const { estrellas, enlaces, altoBanda, margen } = useMemo(
    () => calcularConstelacion(entradas, ancho, alto),
    [entradas, ancho, alto],
  );

  // Polvo de estrellas decorativo (fijo, no cambia entre renders).
  const polvo = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const a = Math.sin(i * 12.9898) * 43758.5453;
        const b = Math.sin(i * 78.233) * 12543.1234;
        return { x: (a - Math.floor(a)) * ancho, y: (b - Math.floor(b)) * alto, r: 0.6 + (i % 3) * 0.4 };
      }),
    [ancho, alto],
  );

  return (
    <Svg width={ancho} height={alto}>
      {polvo.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#FFFFFF" opacity={0.18} />
      ))}

      {EMOCIONES.map((emocion, i) => (
        <SvgText
          key={emocion}
          x={8}
          y={margen + (i + 0.5) * altoBanda + 3}
          fontSize={10}
          fill={ColoresEmocion[emocion]}
          opacity={0.5}>
          {emocion}
        </SvgText>
      ))}

      {enlaces.map((l) => (
        <Line
          key={l.clave}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke={Colors.dark.acento}
          strokeWidth={1}
          opacity={0.5}
        />
      ))}

      {estrellas.map((e) => (
        <EstrellaSvg
          key={e.id}
          estrella={e}
          seleccionada={e.id === seleccionadaId}
          onPress={() => onSeleccionar(e.id)}
        />
      ))}
    </Svg>
  );
}

function EstrellaSvg({
  estrella,
  seleccionada,
  onPress,
}: {
  estrella: Estrella;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const color = ColoresEmocion[estrella.emocion];
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      estrella.fase * 1500,
      withRepeat(
        withTiming(1, { duration: 1600 + estrella.fase * 1400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [estrella.fase, t]);

  const propsHalo = useAnimatedProps(() => ({ opacity: 0.15 + 0.35 * t.value }));

  return (
    <>
      <CirculoAnimado
        cx={estrella.x}
        cy={estrella.y}
        r={estrella.radio * (seleccionada ? 3.4 : 2.6)}
        fill={color}
        animatedProps={propsHalo}
      />
      <Circle cx={estrella.x} cy={estrella.y} r={estrella.radio} fill={color} />
      {seleccionada && (
        <Circle
          cx={estrella.x}
          cy={estrella.y}
          r={estrella.radio + 5}
          stroke="#FFFFFF"
          strokeWidth={1.5}
          fill="none"
        />
      )}
      {/* Área táctil más grande que la estrella */}
      <Circle cx={estrella.x} cy={estrella.y} r={20} fill="transparent" onPress={onPress} />
    </>
  );
}
