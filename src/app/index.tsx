import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Button, FlatList, KeyboardAvoidingView, LayoutAnimation, Platform, StyleSheet,
  Text, TextInput,
  useColorScheme,
  View,
} from "react-native";

import { IngredientGraph } from "@/components/ingredient-graph";
import { OptionsMenu } from "@/components/options-menu";
import { RecipeSuggester } from "@/components/recipe-suggester";
import { SwipeToDeleteRow } from "@/components/swipe-to-delete-row";
import { ingredientIcon, ingredientKey } from "@/lib/ingredient-data";
import { loadPantry, savePantry } from "@/lib/pantry-storage";

type ViewMode = "map" | "list";

export default function Index() {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const [ingredient, setIngredient] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>("map");
  const [removeMode, setRemoveMode] = useState(false);
  const [loaded, setLoaded] = useState(false); // true once the saved list has been read

  // When the app opens, read the saved list. If you typed something before it finished
  // loading, keep both.
  useEffect(() => {
    loadPantry().then((saved) => {
      setIngredients((current) => [...saved, ...current.filter((i) => !saved.includes(i))]);
      setLoaded(true);
    });
  }, []);

  // Save every time the list changes (but not before the load finishes, or the empty
  // starting list would overwrite what was saved).
  useEffect(() => {
    if (loaded) savePantry(ingredients);
  }, [ingredients, loaded]);

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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textColor }]}>My Pantry</Text>
          <OptionsMenu
            items={[
              { label: "My Recipes", onPress: () => router.navigate("/saved") },
              {
                label: removeMode ? "Exit remove mode" : "Remove mode",
                disabled: mode !== "list",
                hint: "List view only",
                onPress: toggleRemoveMode,
              },
            ]}
          />
        </View>
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
  header: { paddingHorizontal: 20, paddingTop: 80 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
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
