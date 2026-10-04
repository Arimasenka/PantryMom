import * as Haptics from "expo-haptics";
import { ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
// right as you drag, and the white ✕ (plus an optional word) sits at its left end, i.e.
// right where your finger is.
function DeleteAction({
  translation, width, threshold, label, accessibilityLabel,
}: {
  translation: SharedValue<number>;
  width: number;
  threshold: number;
  label?: string;
  accessibilityLabel: string;
}) {
  const armed = useDerivedValue(() => -translation.value >= threshold);

  // One small haptic tap each time you drag past the delete point.
  useAnimatedReaction(
    () => armed.value,
    (now, before) => {
      if (now && !before) scheduleOnRN(pop);
    },
  );

  const markStyle = useAnimatedStyle(() => ({
    opacity: withTiming(armed.value ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withTiming(armed.value ? 1 : 0.6, { duration: 120 }) }],
  }));

  return (
    <View
      style={[styles.action, { width }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.mark, markStyle]}>
        <Text style={styles.x}>✕</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </Animated.View>
    </View>
  );
}

type Props = {
  children: ReactNode;
  enabled: boolean;
  onDelete: () => void;
  label?: string; // word shown next to the ✕, e.g. "Delete"
  accessibilityLabel?: string; // what a screen reader calls the delete action
  deleteHaptic?: Haptics.ImpactFeedbackStyle; // optional extra haptic when the delete happens
};

// iOS-style swipe action (like Messages): drag a row left, red fills in from the right,
// pass the delete point and a ✕ + haptic tap appear; release there to delete the row.
export function SwipeToDeleteRow({
  children, enabled, onDelete, label, accessibilityLabel = "Delete", deleteHaptic,
}: Props) {
  const { width } = useWindowDimensions();
  const threshold = width * THRESHOLD_RATIO;

  return (
    <ReanimatedSwipeable
      enabled={enabled}
      overshootRight
      friction={1}
      rightThreshold={threshold}
      renderRightActions={(_progress, translation) => (
        <DeleteAction
          translation={translation}
          width={width}
          threshold={threshold}
          label={label}
          accessibilityLabel={accessibilityLabel}
        />
      )}
      onSwipeableOpen={() => {
        if (deleteHaptic !== undefined) Haptics.impactAsync(deleteHaptic);
        onDelete();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: { backgroundColor: DELETE_RED, justifyContent: "center", alignItems: "flex-start" },
  mark: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 24 },
  x: { color: "#fff", fontSize: 22, fontWeight: "600" },
  label: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
