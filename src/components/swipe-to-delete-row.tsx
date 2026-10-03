import * as Haptics from "expo-haptics";
import { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const THRESHOLD_RATIO = 0.4; // how far across the row you must drag to arm the delete
const DELETE_RED = "#ff3b30"; // iOS system red

// Runs on the JS thread (the animation code below runs on the UI thread and hands off to this).
function pop() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// The red bar revealed behind the row. It is as wide as the row, so it fills in from the
// right as you drag, and the white ✕ sits at its left end, i.e. right where your finger is.
function DeleteAction({
  translation, width, threshold,
}: { translation: SharedValue<number>; width: number; threshold: number }) {
  const armed = useDerivedValue(() => -translation.value >= threshold);

  // One small haptic tap each time you drag past the delete point.
  useAnimatedReaction(
    () => armed.value,
    (now, before) => {
      if (now && !before) scheduleOnRN(pop);
    },
  );

  const xStyle = useAnimatedStyle(() => ({
    opacity: withTiming(armed.value ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withTiming(armed.value ? 1 : 0.6, { duration: 120 }) }],
  }));

  return (
    <View style={[styles.action, { width }]}>
      <Animated.Text style={[styles.x, xStyle]}>✕</Animated.Text>
    </View>
  );
}

type Props = {
  children: ReactNode;
  enabled: boolean;
  onDelete: () => void;
};

// iOS-style swipe action (like Messages): drag a row left, red fills in from the right,
// pass the delete point and a ✕ + haptic tap appear; release there to delete the row.
export function SwipeToDeleteRow({ children, enabled, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const threshold = width * THRESHOLD_RATIO;

  return (
    <ReanimatedSwipeable
      enabled={enabled}
      overshootRight
      friction={1}
      rightThreshold={threshold}
      renderRightActions={(_progress, translation) => (
        <DeleteAction translation={translation} width={width} threshold={threshold} />
      )}
      onSwipeableOpen={() => onDelete()}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: { backgroundColor: DELETE_RED, justifyContent: "center", alignItems: "flex-start" },
  x: { color: "#fff", fontSize: 22, fontWeight: "600", paddingLeft: 24 },
});
