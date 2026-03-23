const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchJson(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PokéAPI error ${res.status}: ${url}`);
  }
  const data = await res.json();
  cache.set(url, { data, at: Date.now() });
  return data;
}

export async function getPokemonById(id) {
  return fetchJson(`${POKEAPI_BASE}/pokemon/${id}`);
}

export async function getPokemonByName(name) {
  const n = String(name).toLowerCase().trim();
  return fetchJson(`${POKEAPI_BASE}/pokemon/${n}`);
}

export async function getRandomPokemonIds(count, exclude = new Set()) {
  const ids = [];
  const maxAttempts = count * 40;
  let attempts = 0;
  while (ids.length < count && attempts < maxAttempts) {
    attempts++;
    const id = 1 + Math.floor(Math.random() * 1025);
    if (exclude.has(id)) continue;
    exclude.add(id);
    ids.push(id);
  }
  return ids;
}

export function getSpriteUrl(pokemon) {
  return (
    pokemon?.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon?.sprites?.front_default ||
    null
  );
}

export function getCryUrl(pokemon) {
  return pokemon?.cries?.latest || pokemon?.cries?.legacy || null;
}

export function summarizePokemon(pokemon) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: (pokemon.types || []).map((t) => t.type.name),
    stats: (pokemon.stats || []).map((s) => ({
      name: s.stat.name,
      base: s.base_stat,
    })),
    sprite: getSpriteUrl(pokemon),
    cryUrl: getCryUrl(pokemon),
  };
}
