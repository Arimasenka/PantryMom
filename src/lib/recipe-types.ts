// The shape of one recipe, plus the limit on the chef's request. Shared by the server
// route (which produces recipes) and the screen (which shows them). It holds no secrets,
// so it is safe to import from client code.
export const MAX_REQUEST_LENGTH = 200;

export type Recipe = {
  title: string;
  time: string;
  ingredientsUsed: string[];
  extraIngredientsNeeded: string[];
  steps: string[];
};

export type SuggestResponse = { recipes: Recipe[] };
