// Ingredient icons + "usage groups" (dishes/meals an ingredient is typically used in).
// Two ingredients are related when they share usage groups. Swap this for AI-based
// relations later by replacing `relatedness`.

type Info = { icon: string; groups: string[] };

const INGREDIENTS: Record<string, Info> = {
  egg: { icon: "🥚", groups: ["breakfast", "baking", "fried-rice"] },
  milk: { icon: "🥛", groups: ["breakfast", "baking", "dessert", "soup"] },
  butter: { icon: "🧈", groups: ["breakfast", "baking", "dessert", "pasta", "sandwich"] },
  cheese: { icon: "🧀", groups: ["pasta", "sandwich", "mexican", "salad", "breakfast"] },
  yogurt: { icon: "🥣", groups: ["breakfast", "dessert"] },
  cream: { icon: "🍦", groups: ["pasta", "dessert", "soup"] },
  bread: { icon: "🍞", groups: ["breakfast", "sandwich"] },
  flour: { icon: "🌾", groups: ["baking", "dessert"] },
  sugar: { icon: "🍬", groups: ["baking", "dessert", "breakfast"] },
  honey: { icon: "🍯", groups: ["breakfast", "dessert", "stir-fry"] },
  chocolate: { icon: "🍫", groups: ["baking", "dessert"] },
  vanilla: { icon: "🌼", groups: ["baking", "dessert"] },
  rice: { icon: "🍚", groups: ["stir-fry", "fried-rice", "mexican", "soup"] },
  pasta: { icon: "🍝", groups: ["pasta"] },
  oat: { icon: "🥣", groups: ["breakfast", "baking"] },
  tortilla: { icon: "🫓", groups: ["mexican", "sandwich"] },
  chicken: { icon: "🍗", groups: ["stir-fry", "soup", "grill", "mexican", "fried-rice"] },
  beef: { icon: "🥩", groups: ["grill", "stir-fry", "mexican", "soup"] },
  pork: { icon: "🥓", groups: ["grill", "stir-fry", "breakfast", "fried-rice"] },
  bacon: { icon: "🥓", groups: ["breakfast", "sandwich", "pasta"] },
  fish: { icon: "🐟", groups: ["grill", "salad"] },
  salmon: { icon: "🍣", groups: ["grill", "salad", "fried-rice"] },
  shrimp: { icon: "🍤", groups: ["pasta", "stir-fry", "fried-rice", "grill"] },
  tofu: { icon: "🧊", groups: ["stir-fry", "soup", "fried-rice"] },
  bean: { icon: "🫘", groups: ["mexican", "soup", "salad"] },
  tomato: { icon: "🍅", groups: ["pasta", "salad", "mexican", "sandwich", "soup"] },
  onion: { icon: "🧅", groups: ["pasta", "soup", "stir-fry", "mexican", "grill", "fried-rice"] },
  garlic: { icon: "🧄", groups: ["pasta", "stir-fry", "soup", "mexican", "grill", "fried-rice"] },
  potato: { icon: "🥔", groups: ["soup", "grill", "breakfast"] },
  carrot: { icon: "🥕", groups: ["soup", "stir-fry", "salad", "fried-rice"] },
  broccoli: { icon: "🥦", groups: ["stir-fry", "soup"] },
  pepper: { icon: "🫑", groups: ["stir-fry", "mexican", "grill", "salad"] },
  mushroom: { icon: "🍄", groups: ["pasta", "stir-fry", "soup", "breakfast"] },
  corn: { icon: "🌽", groups: ["mexican", "soup", "salad", "grill"] },
  lettuce: { icon: "🥬", groups: ["salad", "sandwich"] },
  spinach: { icon: "🥬", groups: ["salad", "pasta", "breakfast", "soup"] },
  cucumber: { icon: "🥒", groups: ["salad", "sandwich"] },
  avocado: { icon: "🥑", groups: ["mexican", "salad", "sandwich", "breakfast"] },
  lemon: { icon: "🍋", groups: ["salad", "grill", "dessert", "baking"] },
  lime: { icon: "🍈", groups: ["mexican", "salad", "grill"] },
  apple: { icon: "🍎", groups: ["breakfast", "dessert", "baking", "salad"] },
  banana: { icon: "🍌", groups: ["breakfast", "dessert", "baking"] },
  strawberry: { icon: "🍓", groups: ["breakfast", "dessert"] },
  blueberry: { icon: "🫐", groups: ["breakfast", "baking", "dessert"] },
  orange: { icon: "🍊", groups: ["breakfast", "dessert", "salad"] },
  ginger: { icon: "🫚", groups: ["stir-fry", "soup", "fried-rice", "baking"] },
  basil: { icon: "🌿", groups: ["pasta", "salad", "sandwich"] },
  cilantro: { icon: "🌿", groups: ["mexican", "salad", "soup"] },
  parsley: { icon: "🌿", groups: ["pasta", "soup", "grill"] },
  salt: { icon: "🧂", groups: ["pasta", "soup", "grill", "baking", "stir-fry", "mexican", "fried-rice"] },
  cinnamon: { icon: "🪵", groups: ["baking", "dessert", "breakfast"] },
  chili: { icon: "🌶️", groups: ["mexican", "stir-fry", "soup"] },
  "olive oil": { icon: "🫒", groups: ["pasta", "salad", "grill", "sandwich"] },
  oil: { icon: "🛢️", groups: ["stir-fry", "fried-rice", "grill", "breakfast"] },
  "soy sauce": { icon: "🍶", groups: ["stir-fry", "fried-rice"] },
  vinegar: { icon: "🍾", groups: ["salad", "grill"] },
  peanut: { icon: "🥜", groups: ["stir-fry", "dessert", "sandwich", "breakfast"] },
  "peanut butter": { icon: "🥜", groups: ["sandwich", "breakfast", "dessert"] },
  water: { icon: "💧", groups: ["soup", "pasta"] },
};

// Plural / phrasing tweaks so "eggs", "tomatoes", "Olive Oil" all resolve.
function normalize(name: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (INGREDIENTS[n]) return n;
  if (n.endsWith("oes") && INGREDIENTS[n.slice(0, -2)]) return n.slice(0, -2);
  if (n.endsWith("ies") && INGREDIENTS[n.slice(0, -3) + "y"]) return n.slice(0, -3) + "y";
  if (n.endsWith("es") && INGREDIENTS[n.slice(0, -2)]) return n.slice(0, -2);
  if (n.endsWith("s") && INGREDIENTS[n.slice(0, -1)]) return n.slice(0, -1);
  return n;
}

export function ingredientKey(name: string): string {
  return normalize(name);
}

export function ingredientIcon(name: string): string | null {
  return INGREDIENTS[normalize(name)]?.icon ?? null;
}

// Number of shared usage groups; 0 means unrelated/unknown.
export function relatedness(a: string, b: string): number {
  const ga = INGREDIENTS[normalize(a)]?.groups;
  const gb = INGREDIENTS[normalize(b)]?.groups;
  if (!ga || !gb) return 0;
  return ga.filter((g) => gb.includes(g)).length;
}

export type Edge = { a: string; b: string };

// Link each ingredient to its `perNode` closest relatives (by shared usage).
// Ingredients with no relatives get no edges and simply float.
export function buildEdges(names: string[], perNode = 2): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const a of names) {
    const ranked = names
      .filter((b) => b !== a)
      .map((b) => ({ b, score: relatedness(a, b) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, perNode);
    for (const { b } of ranked) {
      const id = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!seen.has(id)) {
        seen.add(id);
        edges.push({ a, b });
      }
    }
  }
  return edges;
}
