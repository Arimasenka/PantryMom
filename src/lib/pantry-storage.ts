import AsyncStorage from "@react-native-async-storage/async-storage";

// Saves just the current ingredient list (a list of names) on the phone.
const KEY = "pantry.ingredients";

// Read the saved list. Any problem (nothing saved yet, storage error, corrupted data)
// returns an empty list instead of crashing the app.
export async function loadPantry(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item !== "");
  } catch (error) {
    console.warn("Could not load pantry:", error);
    return [];
  }
}

// Write the list. A failed save is logged and ignored; the list still works in memory.
export async function savePantry(ingredients: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ingredients));
  } catch (error) {
    console.warn("Could not save pantry:", error);
  }
}
