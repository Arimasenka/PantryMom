import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Recipe } from "@/lib/recipe-types";

// Saved recipes live on the phone under one key. Every function wraps storage in try/catch
// so a storage problem never crashes the app.
const KEY = "saved.recipes";

export type SavedRecipe = Recipe & {
  id: string; // unique per recipe (see recipeId)
  request: string; // the chef's request this recipe was generated for ("" if none)
  savedAt: string; // ISO date-time, used for newest-first ordering
};

// A short fingerprint of the recipe's content. The same recipe always gets the same id, so
// it can't be saved twice; different recipes get different ids. (cyrb53 string hash.)
export function recipeId(recipe: Recipe): string {
  const text = JSON.stringify([
    recipe.title.trim().toLowerCase(),
    recipe.time,
    recipe.ingredientsUsed,
    recipe.extraIngredientsNeeded,
    recipe.steps,
  ]);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "recipe-" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

// Guards against old or damaged data in storage.
function isSavedRecipe(v: unknown): v is SavedRecipe {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.time === "string" &&
    typeof r.request === "string" &&
    typeof r.savedAt === "string" &&
    isStringList(r.ingredientsUsed) &&
    isStringList(r.extraIngredientsNeeded) &&
    isStringList(r.steps)
  );
}

const newestFirst = (list: SavedRecipe[]) =>
  [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));

// Returns null (not an empty list) when storage can't be read, so a failed read is never
// mistaken for "nothing saved" and written back over real data.
async function readStored(): Promise<SavedRecipe[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedRecipe) : [];
  } catch (error) {
    console.warn("Could not read saved recipes:", error);
    return null;
  }
}

async function writeStored(list: SavedRecipe[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (error) {
    console.warn("Could not save recipes:", error);
    return false;
  }
}

// Newest first. Empty list if nothing is saved or storage fails.
export async function loadSavedRecipes(): Promise<SavedRecipe[]> {
  return newestFirst((await readStored()) ?? []);
}

// Saves a recipe with the chef's request and the current date. Does nothing if the same
// recipe is already saved. Returns the updated list, or null if storage failed.
export async function saveRecipe(recipe: Recipe, request: string): Promise<SavedRecipe[] | null> {
  const current = await readStored();
  if (current === null) return null;
  const id = recipeId(recipe);
  if (current.some((r) => r.id === id)) return newestFirst(current);
  const next = [...current, { ...recipe, id, request: request.trim(), savedAt: new Date().toISOString() }];
  return (await writeStored(next)) ? newestFirst(next) : null;
}

// Removes a saved recipe. Returns the updated list, or null if storage failed.
export async function deleteSavedRecipe(id: string): Promise<SavedRecipe[] | null> {
  const current = await readStored();
  if (current === null) return null;
  const next = current.filter((r) => r.id !== id);
  return (await writeStored(next)) ? newestFirst(next) : null;
}
