import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data/questions");

let loaded = null;

function loadAll() {
  if (loaded) return loaded;
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const all = [];
  for (const file of files) {
    const raw = readFileSync(join(DATA_DIR, file), "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) continue;
    for (const q of arr) {
      if (
        q &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correct === "number"
      ) {
        all.push({
          ...q,
          difficulty: q.difficulty || "medium",
          category: q.category || "general",
        });
      }
    }
  }
  loaded = all;
  return loaded;
}

export function getAllQuestions() {
  return loadAll();
}

export function pickRandomQuestion(filter = {}) {
  let pool = loadAll();
  if (filter.categories?.length) {
    pool = pool.filter((q) => filter.categories.includes(q.category));
  } else if (filter.category) {
    pool = pool.filter((q) => q.category === filter.category);
  }
  if (filter.difficulties?.length) {
    pool = pool.filter((q) => filter.difficulties.includes(q.difficulty));
  } else if (filter.difficulty) {
    pool = pool.filter((q) => q.difficulty === filter.difficulty);
  }
  if (pool.length === 0) {
    pool = loadAll();
    if (filter.categories?.length) {
      pool = pool.filter((q) => filter.categories.includes(q.category));
    }
    if (filter.difficulties?.length) {
      const p2 = pool.filter((q) => filter.difficulties.includes(q.difficulty));
      if (p2.length > 0) pool = p2;
    }
  }
  if (pool.length === 0) pool = loadAll();
  return pool[Math.floor(Math.random() * pool.length)];
}
