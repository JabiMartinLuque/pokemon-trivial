import {
  getPokemonById,
  getRandomPokemonIds,
  getSpriteUrl,
  getCryUrl,
  summarizePokemon,
} from "../services/pokeapi.js";
import { pickRandomQuestion } from "../services/questions.js";

export const ALL_MINIGAME_TYPES = ["blur", "trivia", "music", "pokedex"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomDuration(type) {
  if (type === "pokedex") return 20000;
  if (type === "blur") return 18000;
  if (type === "music") return 16000;
  return 15000;
}

export function buildRoundSequence(totalRounds, enabledModes) {
  const modes =
    enabledModes?.length > 0 ? [...enabledModes] : [...ALL_MINIGAME_TYPES];
  const seq = [];
  for (let i = 0; i < totalRounds; i++) {
    seq.push(modes[i % modes.length]);
  }
  return shuffle(seq);
}

export async function buildRoundPayload(type, options = {}) {
  try {
    return await buildRoundPayloadInner(type, options);
  } catch (e) {
    console.warn("buildRoundPayload fallback trivia:", e?.message);
    if (type === "trivia") throw e;
    return await buildRoundPayloadInner("trivia", options);
  }
}

async function buildRoundPayloadInner(type, options = {}) {
  const difficulty = options.difficulty || null;
  const triviaCategories = options.triviaCategories || null;
  const triviaDifficulties = options.triviaDifficulties || null;

  if (type === "trivia") {
    const q = pickRandomQuestion({
      ...(difficulty ? { difficulty } : {}),
      ...(triviaCategories?.length ? { categories: triviaCategories } : {}),
      ...(triviaDifficulties?.length ? { difficulties: triviaDifficulties } : {}),
    });
    return {
      type: "trivia",
      durationMs: randomDuration("trivia"),
      payload: {
        questionId: `trivia-${Date.now()}`,
        question: q.question,
        options: q.options,
        correctIndex: q.correct,
        category: q.category,
        difficulty: q.difficulty,
      },
    };
  }

  if (type === "blur" || type === "music" || type === "pokedex") {
    const correctId = (await getRandomPokemonIds(1))[0];
    const wrongIds = await getRandomPokemonIds(3, new Set([correctId]));
    const ids = shuffle([correctId, ...wrongIds]);
    const pokemonList = await Promise.all(ids.map((id) => getPokemonById(id)));
    const names = pokemonList.map((p) => ({
      id: p.id,
      name: capitalize(p.name),
    }));
    const correctIndex = pokemonList.findIndex((p) => p.id === correctId);
    const sprite = getSpriteUrl(pokemonList[correctIndex]);
    const cryUrl = getCryUrl(pokemonList[correctIndex]);

    if (type === "blur") {
      return {
        type: "blur",
        durationMs: randomDuration("blur"),
        payload: {
          pokemonId: correctId,
          imageUrl: sprite,
          options: names.map((n) => n.name),
          correctIndex,
          blurMaxPx: 28,
        },
      };
    }

    if (type === "music") {
      return {
        type: "music",
        durationMs: randomDuration("music"),
        payload: {
          pokemonId: correctId,
          imageUrl: sprite,
          options: names.map((n) => n.name),
          correctIndex,
          audioUrl: cryUrl,
          audioSource: cryUrl ? "pokeapi_cry" : "none",
        },
      };
    }

    if (type === "pokedex") {
      const summary = summarizePokemon(pokemonList[correctIndex]);
      return {
        type: "pokedex",
        durationMs: randomDuration("pokedex"),
        payload: {
          pokemonId: correctId,
          imageUrl: summary.sprite,
          correctNumber: correctId,
          correctPokemonName: capitalize(pokemonList[correctIndex].name),
          hint: "Escribe el número de Pokédex (1–1025)",
        },
      };
    }
  }

  return buildRoundPayloadInner("trivia", options);
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
