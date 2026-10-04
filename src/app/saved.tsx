import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  Button, FlatList, LayoutAnimation, Pressable, StyleSheet, Text, useColorScheme, View,
} from "react-native";

import { OptionsMenu } from "@/components/options-menu";
import { SwipeToDeleteRow } from "@/components/swipe-to-delete-row";
import { useSavedRecipes } from "@/hooks/use-saved-recipes";

// The "My Recipes" tab: saved recipes, newest first. Tap one to expand it. Turn on
// "Delete mode" in the ⋯ menu, then swipe a recipe left to delete it.
export default function SavedScreen() {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const muted = dark ? "#aaa" : "#555";
  const lineColor = dark ? "#333" : "#ddd";

  const { saved, remove } = useSavedRecipes();
  const [deleteMode, setDeleteMode] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggleExpanded(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function deleteRecipe(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // rows below slide up
    remove(id);
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? "#000" : "#fff" }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textColor }]}>My Recipes</Text>
          <OptionsMenu
            items={[
              {
                label: deleteMode ? "Exit delete mode" : "Delete mode",
                onPress: () => setDeleteMode((on) => !on),
              },
            ]}
          />
        </View>
      </View>

      {deleteMode && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Delete mode: swipe a recipe left to delete it</Text>
          <Button title="Done" color="#ff5c5c" onPress={() => setDeleteMode(false)} />
        </View>
      )}

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No saved recipes yet. Tap the ♡ on a recipe on the Home tab to save it.
          </Text>
        }
        renderItem={({ item }) => {
          const open = expanded.includes(item.id);
          const savedOn = new Date(item.savedAt).toLocaleDateString(undefined, {
            month: "short", day: "numeric", year: "numeric",
          });
          return (
            <SwipeToDeleteRow
              enabled={deleteMode}
              label="Delete"
              accessibilityLabel={`Delete ${item.title}`}
              deleteHaptic={Haptics.ImpactFeedbackStyle.Heavy}
              onDelete={() => deleteRecipe(item.id)}
            >
              <Pressable
                onPress={() => toggleExpanded(item.id)}
                style={[styles.row, { borderBottomColor: lineColor }]}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.time}`}
                accessibilityHint={open ? "Collapses the recipe" : "Expands the recipe"}
                accessibilityState={{ expanded: open }}
                accessibilityActions={deleteMode ? [{ name: "delete", label: `Delete ${item.title}` }] : undefined}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "delete") deleteRecipe(item.id);
                }}
              >
                <Text style={[styles.rowTitle, { color: textColor }]}>{item.title}</Text>
                <Text style={{ color: muted }}>⏱ {item.time} · saved {savedOn}</Text>
                <Text style={[styles.request, { color: muted }]}>
                  {item.request ? `Chef's request: “${item.request}”` : "No chef's request"}
                </Text>
                {open && (
                  <View style={styles.details}>
                    <Text style={[styles.heading, { color: textColor }]}>Uses</Text>
                    <Text style={{ color: textColor }}>{item.ingredientsUsed.join(", ")}</Text>
                    {item.extraIngredientsNeeded.length > 0 && (
                      <>
                        <Text style={[styles.heading, { color: textColor }]}>You'll also need</Text>
                        <Text style={{ color: textColor }}>{item.extraIngredientsNeeded.join(", ")}</Text>
                      </>
                    )}
                    <Text style={[styles.heading, { color: textColor }]}>Steps</Text>
                    {item.steps.map((step, n) => (
                      <Text key={n} style={{ color: textColor }}>{n + 1}. {step}</Text>
                    ))}
                  </View>
                )}
              </Pressable>
            </SwipeToDeleteRow>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 80 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
  banner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#ff5c5c22", paddingHorizontal: 20, paddingVertical: 4,
  },
  bannerText: { color: "#ff5c5c", flexShrink: 1 },
  empty: { color: "#888", padding: 20 },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  rowTitle: { fontSize: 18, fontWeight: "bold" },
  request: { fontStyle: "italic" },
  details: { marginTop: 8, gap: 2 },
  heading: { fontWeight: "600", marginTop: 6 },
});
