import * as Haptics from "expo-haptics";
import { ReactNode, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

const THRESHOLD_RATIO = 0.4; // how far across the row (fraction of its width) arms the delete
const DELETE_RED = "#ff3b30";

type Props = {
  children: ReactNode;
  enabled: boolean;
  onDelete: () => void;
};

// A row you drag to the left: red fills in from the right edge, and once you pass the
// delete point a white ✕ appears and the phone gives a small tap. Let go while it's
// showing and the row is deleted; let go before that and it springs back.
export function SwipeToDeleteRow({ children, enabled, onDelete }: Props) {
  const x = useRef(new Animated.Value(0)).current; // 0 = resting, negative = dragged left
  const width = useRef(0);
  const armedRef = useRef(false);
  const [armed, setArmed] = useState(false);

  // The PanResponder is created once, so it reads the latest props through refs.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  function setArmedState(next: boolean) {
    if (armedRef.current === next) return;
    armedRef.current = next;
    setArmed(next);
    if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // the "pop" at the delete point
  }

  function springBack() {
    setArmedState(false);
    Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
  }

  const pan = useRef(
    PanResponder.create({
      // Only claim mostly-horizontal leftward drags so vertical list scrolling still works.
      onMoveShouldSetPanResponder: (_e, g) =>
        enabledRef.current && g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        const dx = Math.min(0, g.dx);
        x.setValue(dx);
        setArmedState(-dx >= width.current * THRESHOLD_RATIO);
      },
      onPanResponderRelease: () => {
        if (armedRef.current) {
          Animated.timing(x, {
            toValue: -width.current, duration: 150, useNativeDriver: false,
          }).start(() => onDeleteRef.current());
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    }),
  ).current;

  const redWidth = x.interpolate({ inputRange: [-10000, 0], outputRange: [10000, 0], extrapolate: "clamp" });

  return (
    <View style={styles.container} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
      <Animated.View style={[styles.red, { width: redWidth }]}>
        {armed && <Text style={styles.x}>✕</Text>}
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  red: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    backgroundColor: DELETE_RED,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
    overflow: "hidden",
  },
  x: { color: "#fff", fontSize: 20, fontWeight: "600", paddingLeft: 20 },
});
