/**
 * Formas base de los iniciales (gen 1–9). "Primera evolución" = starter base.
 */
export const STARTERS = [
  { id: 1, name: "Bulbasaur", type: "grass" },
  { id: 4, name: "Charmander", type: "fire" },
  { id: 7, name: "Squirtle", type: "water" },
  { id: 152, name: "Chikorita", type: "grass" },
  { id: 155, name: "Cyndaquil", type: "fire" },
  { id: 158, name: "Totodile", type: "water" },
  { id: 252, name: "Treecko", type: "grass" },
  { id: 255, name: "Torchic", type: "fire" },
  { id: 258, name: "Mudkip", type: "water" },
  { id: 387, name: "Turtwig", type: "grass" },
  { id: 390, name: "Chimchar", type: "fire" },
  { id: 393, name: "Piplup", type: "water" },
  { id: 495, name: "Snivy", type: "grass" },
  { id: 498, name: "Tepig", type: "fire" },
  { id: 501, name: "Oshawott", type: "water" },
  { id: 650, name: "Chespin", type: "grass" },
  { id: 653, name: "Fennekin", type: "fire" },
  { id: 656, name: "Froakie", type: "water" },
  { id: 722, name: "Rowlet", type: "grass" },
  { id: 725, name: "Litten", type: "fire" },
  { id: 728, name: "Popplio", type: "water" },
  { id: 810, name: "Grookey", type: "grass" },
  { id: 813, name: "Scorbunny", type: "fire" },
  { id: 816, name: "Sobble", type: "water" },
  { id: 906, name: "Sprigatito", type: "grass" },
  { id: 909, name: "Fuecoco", type: "fire" },
  { id: 912, name: "Quaxly", type: "water" },
];

export const STARTER_IDS = new Set(STARTERS.map((s) => s.id));

export function getStarterSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
