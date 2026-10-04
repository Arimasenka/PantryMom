import { useState } from "react";
import {
  Button, FlatList, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, StyleSheet,
  Text, TextInput,
  useColorScheme,
  View,
} from "react-native";

import { IngredientGraph } from "@/components/ingredient-graph";
import { RecipeSuggester } from "@/components/recipe-suggester";
import { SwipeToDeleteRow } from "@/components/swipe-to-delete-row";
import { ingredientIcon, ingredientKey } from "@/lib/ingredient-data";

type ViewMode = "map" | "list";

export default function Index() {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const [ingredient, setIngredient] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>("map");
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);

  function addIngredient() {
    const key = ingredientKey(ingredient);
    if (key === "" || ingredients.includes(key)) {
      setIngredient("");
      return;
    }
    setIngredients([...ingredients, key]);
    setIngredient("");
  }

  function removeIngredient(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // rows below slide up
    setIngredients((prev) => prev.filter((i) => i !== key));
  }

  function toggleRemoveMode() {
    setRemoveMode((on) => !on);
    setMenuOpen(false);
  }

  // Remove mode only exists in list view, so leaving the list turns it off.
  function toggleViewMode() {
    if (mode === "list") setRemoveMode(false);
    setMode(mode === "map" ? "list" : "map");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: dark ? "#000" : "#fff" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Tapping anywhere outside the menu closes it. */}
      {menuOpen && <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textColor }]}>My Pantry</Text>
          <Pressable
            onPress={() => setMenuOpen((open) => !open)}
            hitSlop={12}
            accessibilityLabel="Options menu"
          >
            <Text style={[styles.dots, { color: textColor }]}>⋯</Text>
          </Pressable>
        </View>
        {menuOpen && (
          <View style={[styles.menu, { backgroundColor: dark ? "#2a2a2e" : "#fff", borderColor: dark ? "#444" : "#ddd" }]}>
            <Pressable
              style={[styles.menuItem, mode !== "list" && styles.menuItemDisabled]}
              disabled={mode !== "list"}
              onPress={toggleRemoveMode}
            >
              <Text style={[styles.menuText, { color: textColor }]}>
                {removeMode ? "Exit remove mode" : "Remove mode"}
              </Text>
              {mode !== "list" && <Text style={styles.menuHint}>List view only</Text>}
            </Pressable>
          </View>
        )}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Add an ingredient"
            placeholderTextColor="#888"
            value={ingredient}
            onChangeText={setIngredient}
            onSubmitEditing={addIngredient}
          />
          <Button title="Add" onPress={addIngredient} />
          <Button
            title={mode === "map" ? "List" : "Map"}
            onPress={toggleViewMode}
          />
        </View>
      </View>

      {removeMode && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Remove mode: swipe an ingredient left to remove it</Text>
          <Button title="Done" color="#ff5c5c" onPress={() => setRemoveMode(false)} />
        </View>
      )}

      {/* Graph stays mounted (just hidden) so its layout and camera survive toggling. */}
      <View style={[styles.body, mode !== "map" && styles.hidden]}>
        <IngredientGraph ingredients={ingredients} />
      </View>
      {mode === "list" && (
        <FlatList
          style={styles.body}
          contentContainerStyle={styles.listContent}
          data={ingredients}
          keyExtractor={(item) => item}
          ListEmptyComponent={<Text style={styles.empty}>No ingredients yet</Text>}
          renderItem={({ item }) => (
            <SwipeToDeleteRow enabled={removeMode} onDelete={() => removeIngredient(item)}>
              <View style={styles.listRow}>
                <Text style={styles.listIcon}>
                  {ingredientIcon(item) ?? item.charAt(0).toUpperCase()}
                </Text>
                <Text style={[styles.listText, { color: textColor }]}>{item}</Text>
              </View>
            </SwipeToDeleteRow>
          )}
        />
      )}
      <RecipeSuggester ingredients={ingredients} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  header: { paddingHorizontal: 20, paddingTop: 80, zIndex: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
  dots: { fontSize: 32, lineHeight: 32, paddingHorizontal: 6 },
  menu: {
    position: "absolute", right: 20, top: 120, zIndex: 20,
    borderWidth: 1, borderRadius: 10, minWidth: 170,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuItemDisabled: { opacity: 0.4 },
  menuText: { fontSize: 16 },
  menuHint: { fontSize: 12, color: "#888", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#999", padding: 10 },
  banner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#ff5c5c22", paddingHorizontal: 20, paddingVertical: 4, marginTop: 8,
  },
  bannerText: { color: "#ff5c5c", flexShrink: 1 },
  body: { flex: 1 },
  hidden: { display: "none" },
  listContent: { paddingTop: 12 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 20, gap: 12 },
  listIcon: { fontSize: 24, width: 32, textAlign: "center" },
  listText: { fontSize: 18, flex: 1 },
  empty: { color: "#888", paddingTop: 12 },
});
