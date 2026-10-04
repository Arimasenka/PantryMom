import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Button, Keyboard, LayoutAnimation, PanResponder, Pressable,
  ScrollView, StyleSheet, Text, TextInput, useColorScheme, View,
} from "react-native";

import { useSavedRecipes } from "@/hooks/use-saved-recipes";
import { MAX_REQUEST_LENGTH, type Recipe, type SuggestResponse } from "@/lib/recipe-types";
import { recipeId } from "@/lib/saved-recipes";

// "Chef's request" box + "Suggest recipes" button + the recipe cards, at the bottom of the
// Home screen. Swipe the gray pill at its top down to hide it; swipe up (or tap the pill)
// to bring it back. It only talks to our own /suggest route; the Claude API key lives on
// the server and never reaches this file.
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

  // Collapsed = only the pill bar is showing. `drag` is how far the panel is being pulled
  // down right now (it follows the finger).
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const drag = useRef(new Animated.Value(0)).current;

  function setPanelCollapsed(next: boolean) {
    Keyboard.dismiss();
    drag.setValue(0);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // smooth resize
    setCollapsed(next);
  }

  function springBack() {
    Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
  }

  // Touch handling for the pill area. Open: dragging down follows your finger, and letting
  // go after a long (or fast) enough pull hides the panel; otherwise it springs back.
  // Hidden: a tap or an upward swipe brings it back.
  const grabber = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (!collapsedRef.current) drag.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        if (collapsedRef.current) {
          const tapped = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8;
          if (tapped || g.dy < -30) setPanelCollapsed(false);
        } else if (g.dy > 70 || g.vy > 0.8) {
          setPanelCollapsed(true);
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    }),
  ).current;

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
      // Generation is done: close the keyboard so the results aren't hidden behind it and
      // the panel settles at its normal height.
      Keyboard.dismiss();
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

  // The pill and the swipe only exist once there are recipes to look at.
  const hasRecipes = recipes.length > 0;
  const isCollapsed = hasRecipes && collapsed;

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateY: drag }] }]}>
      <View
        {...(hasRecipes ? grabber.panHandlers : {})}
        style={hasRecipes ? styles.grabber : undefined}
        accessible={hasRecipes}
        accessibilityRole={hasRecipes ? "button" : undefined}
        accessibilityLabel={hasRecipes ? (isCollapsed ? "Show recipe panel" : "Hide recipe panel") : undefined}
        accessibilityHint={
          hasRecipes ? (isCollapsed ? "Swipe up or double tap to open" : "Swipe down or double tap to close") : undefined
        }
        onAccessibilityTap={hasRecipes ? () => setPanelCollapsed(!isCollapsed) : undefined}
      >
        {hasRecipes && <View style={styles.pill} />}
        <Text
          style={[
            styles.label,
            { color: isCollapsed ? muted : textColor, alignSelf: isCollapsed ? "center" : "flex-start" },
          ]}
        >
          {isCollapsed ? "Suggest recipes" : "Chef's request (optional)"}
        </Text>
      </View>
      {!isCollapsed && (
        <>
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
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 20, paddingVertical: 10 },
  grabber: { paddingBottom: 4 },
  pill: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "#8e8e93", marginBottom: 8 },
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
