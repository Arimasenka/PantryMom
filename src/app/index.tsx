import { useState } from "react";
import {
  Button, StyleSheet,
  Text, TextInput,
  useColorScheme,
  View,
} from "react-native";

import { IngredientGraph } from "@/components/ingredient-graph";
import { ingredientKey } from "@/lib/ingredient-data";

export default function Index() {
  const dark = useColorScheme() === "dark";
  const textColor = dark ? "#fff" : "#000";
  const [ingredient, setIngredient] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);

  function addIngredient() {
    const key = ingredientKey(ingredient);
    if (key === "" || ingredients.includes(key)) {
      setIngredient("");
      return;
    }
    setIngredients([...ingredients, key]);
    setIngredient("");
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? "#000" : "#fff" }]}>
      <Text style={[styles.title, { color: textColor }]}>My Pantry</Text>
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
      </View>
      <IngredientGraph ingredients={ingredients} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#999", padding: 10 },
});
