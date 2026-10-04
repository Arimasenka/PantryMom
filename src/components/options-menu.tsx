import { useRef, useState } from "react";
import {
  Modal, Pressable, StyleSheet, Text, useColorScheme, useWindowDimensions, View,
} from "react-native";

export type MenuItem = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string; // small grey text under the label, e.g. why it's disabled
};

// The three-dots (⋯) button plus its dropdown. The dropdown lives in a Modal so it floats
// above everything and tapping anywhere outside it closes it.
export function OptionsMenu({ items }: { items: MenuItem[] }) {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const { width: windowWidth } = useWindowDimensions();
  const buttonRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 20 });

  // Measure where the button is so the dropdown can sit right under it.
  function openMenu() {
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: Math.max(windowWidth - (x + w), 8) });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={openMenu}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Options menu"
      >
        <Text style={[styles.dots, { color: textColor }]}>⋯</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close menu"
        />
        <View
          style={[
            styles.menu,
            {
              top: anchor.top, right: anchor.right,
              backgroundColor: dark ? "#2a2a2e" : "#fff",
              borderColor: dark ? "#444" : "#ddd",
            },
          ]}
        >
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.item, item.disabled && styles.itemDisabled]}
              disabled={item.disabled}
              onPress={() => {
                setOpen(false);
                item.onPress();
              }}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: !!item.disabled }}
            >
              <Text style={[styles.itemText, { color: textColor }]}>{item.label}</Text>
              {item.disabled && item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: { fontSize: 32, lineHeight: 32, paddingHorizontal: 6 },
  menu: {
    position: "absolute", borderWidth: 1, borderRadius: 10, minWidth: 180,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: { paddingVertical: 12, paddingHorizontal: 16 },
  itemDisabled: { opacity: 0.4 },
  itemText: { fontSize: 16 },
  hint: { fontSize: 12, color: "#888", marginTop: 2 },
});
