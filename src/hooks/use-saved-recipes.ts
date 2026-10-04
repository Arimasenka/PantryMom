import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import type { Recipe } from "@/lib/recipe-types";
import {
  deleteSavedRecipe, loadSavedRecipes, saveRecipe, type SavedRecipe,
} from "@/lib/saved-recipes";

// Gives a screen the saved recipes plus save/remove actions. It re-reads storage every time
// the screen comes into focus, so the hearts on the Home tab and the list on the Saved tab
// always agree (both tabs stay alive in the background).
export function useSavedRecipes() {
  const [saved, setSaved] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSavedRecipes().then((list) => {
        if (active) setSaved(list);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const savedIds = useMemo(() => new Set(saved.map((r) => r.id)), [saved]);

  async function save(recipe: Recipe, request: string) {
    const list = await saveRecipe(recipe, request);
    if (list) setSaved(list);
  }

  async function remove(id: string) {
    setSaved((prev) => prev.filter((r) => r.id !== id)); // update the screen right away
    const list = await deleteSavedRecipe(id);
    if (list) setSaved(list);
  }

  return { saved, savedIds, save, remove };
}
