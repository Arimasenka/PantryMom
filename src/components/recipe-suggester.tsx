import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View,
} from "react-native";

import { useSavedRecipes } from "@/hooks/use-saved-recipes";
import { MAX_REQUEST_LENGTH, type Recipe, type SuggestResponse } from "@/lib/recipe-types";
import { recipeId } from "@/lib/saved-recipes";

// "Chef's request" box + "Suggest recipes" button + the recipe cards. It only talks to our
// own /suggest route; the Claude API key lives on the server and never reaches this file.
export function RecipeSuggester({ ingredients }: { ingredients: string[] }) {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const muted = dark ? "#aaa" : "#555";
  const border = dark ? "#333" : "#ddd";

  const { savedIds, save, remove } = useSavedRecipes();
  const [request, setRequest] = useState("");
  const [usedRequest, setUsedRequest] = useState(""); // the request the shown recipes were made for
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, request }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      setRecipes((data as SuggestResponse).recipes);
      setUsedRequest(request.trim());
    } catch (e) {
      // A thrown TypeError means we never reached the server (offline, server down).
      setError(
        e instanceof TypeError
          ? "Couldn't reach the recipe service. Check your connection and try again."
          : e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Heart tapped: save the recipe (with its chef's request and today's date), or un-save it.
  function toggleSaved(recipe: Recipe) {
    const id = recipeId(recipe);
    if (savedIds.has(id)) {
      remove(id);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      save(recipe, usedRequest);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={[styles.label, { color: textColor }]}>Chef's request (optional)</Text>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: dark ? "#555" : "#999" }]}
        placeholder="e.g. something quick and spicy"
        placeholderTextColor="#888"
        value={request}
        onChangeText={setRequest}
        maxLength={MAX_REQUEST_LENGTH}
      />
      <Text style={[styles.counter, { color: muted }]}>{request.length}/{MAX_REQUEST_LENGTH}</Text>
      <View style={styles.buttonRow}>
        <Button
          title={loading ? "Cooking up ideas…" : "Suggest recipes"}
          onPress={suggest}
          disabled={ingredients.length === 0 || loading}
        />
        {loading && <ActivityIndicator />}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {recipes.length > 0 && (
        <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
          {recipes.map((r, i) => (
            <View key={`${r.title}-${i}`} style={[styles.card, { borderColor: border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: textColor }]}>{r.title}</Text>
                <Pressable
                  onPress={() => toggleSaved(r)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    savedIds.has(recipeId(r))
                      ? `Remove ${r.title} from saved recipes`
                      : `Save ${r.title}`
                  }
                  accessibilityState={{ selected: savedIds.has(recipeId(r)) }}
                >
                  <Text style={[styles.heart, { color: savedIds.has(recipeId(r)) ? "#ff3b30" : muted }]}>
                    {savedIds.has(recipeId(r)) ? "♥" : "♡"}
                  </Text>
                </Pressable>
              </View>
              <Text style={{ color: muted }}>⏱ {r.time}</Text>
              <Text style={[styles.heading, { color: textColor }]}>Uses</Text>
              <Text style={{ color: textColor }}>{r.ingredientsUsed.join(", ")}</Text>
              {r.extraIngredientsNeeded.length > 0 && (
                <>
                  <Text style={[styles.heading, { color: textColor }]}>You'll also need</Text>
                  <Text style={{ color: textColor }}>{r.extraIngredientsNeeded.join(", ")}</Text>
                </>
              )}
              <Text style={[styles.heading, { color: textColor }]}>Steps</Text>
              {r.steps.map((s, n) => (
                <Text key={n} style={{ color: textColor }}>{n + 1}. {s}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 20, paddingVertical: 10 },
  label: { fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, padding: 10 },
  counter: { fontSize: 12, textAlign: "right", marginTop: 2, marginBottom: 4 },
  buttonRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  error: { color: "#e5484d", marginTop: 6, textAlign: "center" },
  results: { maxHeight: 260, marginTop: 8 },
  resultsContent: { gap: 10, paddingBottom: 12 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 2 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold", flex: 1 },
  heart: { fontSize: 26, lineHeight: 28 },
  heading: { fontWeight: "600", marginTop: 6 },
});
