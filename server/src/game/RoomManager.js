import { randomUUID } from "crypto";
import { config } from "../config.js";
import { buildRoundPayload, buildRoundSequence, ALL_MINIGAME_TYPES } from "./roundBuilder.js";
import { STARTER_IDS, STARTERS } from "../data/starters.js";

const MAX_PLAYERS = 8;

const DEFAULT_CATS = ["tipos", "stats", "mecanicas", "objetos"];
const DEFAULT_DIFFS = ["easy", "medium", "hard"];

function normalizeName(name) {
  return String(name || "")
    .trim()
    .slice(0, 24);
}

function generateRoomCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

/** Puntos más bajos y legibles: acierto + bonus rapidez */
function scoreForChoice(correct, elapsedMs, durationMs) {
  if (!correct) return 0;
  const base = 50;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const speedBonus = Math.floor(25 * (1 - t));
  return base + speedBonus;
}

function normalizeGameOptions(opts = {}) {
  const totalRounds = Math.min(20, Math.max(1, Number(opts.totalRounds) || config.roundsPerGame));
  let enabledModes = ALL_MINIGAME_TYPES.filter((m) =>
    Array.isArray(opts.enabledModes) ? opts.enabledModes.includes(m) : true
  );
  if (enabledModes.length === 0) enabledModes = ["trivia"];
  let triviaCategories = DEFAULT_CATS.filter((c) =>
    Array.isArray(opts.triviaCategories) ? opts.triviaCategories.includes(c) : true
  );
  if (triviaCategories.length === 0) triviaCategories = [...DEFAULT_CATS];
  let triviaDifficulties = DEFAULT_DIFFS.filter((d) =>
    Array.isArray(opts.triviaDifficulties) ? opts.triviaDifficulties.includes(d) : true
  );
  if (triviaDifficulties.length === 0) triviaDifficulties = [...DEFAULT_DIFFS];
  return { totalRounds, enabledModes, triviaCategories, triviaDifficulties };
}

export class RoomManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.rooms = new Map();
  }

  createRoom(hostSocketId) {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room = {
      code,
      hostSocketId,
      players: new Map(),
      phase: "lobby",
      currentRound: 0,
      totalRounds: config.roundsPerGame,
      gameOptions: null,
      roundSequence: [],
      activeRound: null,
      questionOpen: false,
      answers: new Map(),
    };
    this.rooms.set(code, room);
    return code;
  }

  getRoom(code) {
    return this.rooms.get(String(code)) || null;
  }

  deleteRoom(code) {
    this.rooms.delete(String(code));
  }

  joinRoom(code, socketId, rawName, starterId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Sala no encontrada" };
    if (room.phase !== "lobby") return { error: "La partida ya ha comenzado" };
    const name = normalizeName(rawName);
    if (name.length < 2) return { error: "Nombre demasiado corto (mín. 2)" };
    const sid = Number(starterId);
    if (!Number.isInteger(sid) || !STARTER_IDS.has(sid)) {
      return { error: "Elige un Pokémon inicial válido" };
    }
    const lower = name.toLowerCase();
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === lower) {
        return { error: "Ese nombre ya está en uso en la sala" };
      }
    }
    if (room.players.size >= MAX_PLAYERS) {
      return { error: "Sala llena (máx. 8 jugadores)" };
    }
    const id = randomUUID();
    const starterType = STARTERS.find((s) => s.id === sid)?.type || "normal";
    room.players.set(socketId, {
      id,
      name,
      score: 0,
      starterId: sid,
      starterType,
    });
    return {
      player: { id, name, score: 0, starterId: sid, starterType },
    };
  }

  removePlayer(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(socketId)) {
        room.players.delete(socketId);
        if (room.players.size === 0 && room.hostSocketId === socketId) {
          this.deleteRoom(code);
        }
        return code;
      }
    }
    return null;
  }

  playerList(room) {
    return [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      starterId: p.starterId,
      starterType: p.starterType,
    }));
  }

  async startGame(code, opts = {}) {
    const room = this.getRoom(code);
    if (!room) return { error: "Sala no encontrada" };
    if (room.players.size < 1) return { error: "Se necesita al menos 1 jugador" };
    const go = normalizeGameOptions(opts);
    room.phase = "playing";
    room.currentRound = 0;
    room.totalRounds = go.totalRounds;
    room.gameOptions = {
      enabledModes: go.enabledModes,
      triviaCategories: go.triviaCategories,
      triviaDifficulties: go.triviaDifficulties,
    };
    room.roundSequence = buildRoundSequence(room.totalRounds, go.enabledModes);
    room.activeRound = null;
    room.answers = new Map();
    return await this.startNextQuestion(code);
  }

  async startNextQuestion(code) {
    const room = this.getRoom(code);
    if (!room) return { error: "Sala no encontrada" };
    room.currentRound += 1;
    if (room.currentRound > room.totalRounds) {
      room.phase = "finished";
      room.questionOpen = false;
      return { event: "game_finished", ranking: this.ranking(room) };
    }
    room.phase = "playing";
    const type = room.roundSequence[room.currentRound - 1];
    const built = await buildRoundPayload(type, {
      triviaCategories: room.gameOptions?.triviaCategories,
      triviaDifficulties: room.gameOptions?.triviaDifficulties,
    });
    const startedAt = Date.now();
    room.activeRound = {
      ...built,
      startedAt,
      roundIndex: room.currentRound,
    };
    room.questionOpen = true;
    room.answers = new Map();
    return {
      event: "question",
      public: this.publicRound(room),
    };
  }

  publicRound(room) {
    const r = room.activeRound;
    if (!r) return null;
    const { type, durationMs, payload, startedAt, roundIndex } = r;
    const safe = { ...payload };
    delete safe.correctIndex;
    delete safe.correctNumber;
    delete safe.correctPokemonName;
    return {
      type,
      durationMs,
      startedAt,
      roundIndex,
      totalRounds: room.totalRounds,
      payload: safe,
    };
  }

  submitAnswer(code, socketId, body) {
    const room = this.getRoom(code);
    if (!room || !room.activeRound || !room.questionOpen) {
      return { error: "No hay pregunta activa" };
    }
    const player = room.players.get(socketId);
    if (!player) return { error: "No eres jugador de esta sala" };
    if (room.answers.has(player.id)) return { error: "Ya respondiste" };

    const r = room.activeRound;
    const elapsed = Date.now() - r.startedAt;
    if (elapsed > r.durationMs + 500) return { error: "Tiempo agotado" };

    if (r.type === "pokedex") {
      const num = Number(body?.value);
      if (!Number.isFinite(num)) return { error: "Número inválido" };
      room.answers.set(player.id, {
        playerId: player.id,
        value: num,
        elapsedMs: elapsed,
      });
      return {
        ok: true,
        pending: true,
        totalScore: player.score,
      };
    }

    const idx = Number(body?.answerIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      return { error: "Opción inválida" };
    }
    const correct = idx === r.payload.correctIndex;
    const points = scoreForChoice(correct, elapsed, r.durationMs);
    room.answers.set(player.id, {
      playerId: player.id,
      answerIndex: idx,
      elapsedMs: elapsed,
      points,
      correct,
    });
    player.score += points;
    return {
      ok: true,
      points,
      correct,
      totalScore: player.score,
    };
  }

  endQuestionAndScore(code) {
    const room = this.getRoom(code);
    if (!room || !room.activeRound) return null;
    room.questionOpen = false;
    const r = room.activeRound;
    const elapsed = Date.now() - r.startedAt;
    const durationMs = r.durationMs;

    for (const player of room.players.values()) {
      if (room.answers.has(player.id)) continue;
      room.answers.set(player.id, {
        playerId: player.id,
        missed: true,
        points: 0,
        correct: false,
      });
    }

    if (r.type === "pokedex") {
      const correctNum = r.payload.correctNumber;
      const valid = [];
      for (const player of room.players.values()) {
        const a = room.answers.get(player.id);
        if (!a || a.missed || !Number.isFinite(a.value)) continue;
        valid.push({
          playerId: player.id,
          player,
          dist: Math.abs(Number(a.value) - correctNum),
          elapsedMs: a.elapsedMs,
        });
      }
      valid.sort((a, b) => a.dist - b.dist || a.elapsedMs - b.elapsedMs);

      let rank = 1;
      for (let i = 0; i < valid.length; i++) {
        if (i > 0 && valid[i].dist !== valid[i - 1].dist) {
          rank = i + 1;
        }
        let pts = 0;
        if (rank === 1) {
          const t = Math.min(1, Math.max(0, valid[i].elapsedMs / durationMs));
          pts = 60 + Math.floor(15 * (1 - t));
        } else if (rank === 2) {
          pts = 35;
        } else if (rank === 3) {
          pts = 20;
        }
        valid[i].player.score += pts;
        const prev = room.answers.get(valid[i].playerId);
        room.answers.set(valid[i].playerId, {
          ...prev,
          points: pts,
          correct: rank === 1,
        });
      }
    }

    const perPlayer = [...room.players.values()].map((p) => {
      const a = room.answers.get(p.id);
      return {
        playerId: p.id,
        name: p.name,
        score: p.score,
        roundPoints: a?.points ?? 0,
        correct: a?.correct ?? false,
        missed: a?.missed ?? false,
      };
    });

    const reveal = {
      type: r.type,
      correctIndex: r.payload.correctIndex,
      correctNumber: r.payload.correctNumber,
      correctPokemonName: r.payload.correctPokemonName,
      options: r.payload.options,
      question: r.payload.question,
      imageUrl: r.payload.imageUrl,
      correctSummary: formatCorrectSummary(r),
    };

    room.phase = "results";
    const out = {
      reveal,
      ranking: this.ranking(room),
      perPlayer,
      elapsed: Math.min(elapsed, r.durationMs),
    };
    room.activeRound = null;
    return out;
  }

  ranking(room) {
    return [...room.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        starterId: p.starterId,
        starterType: p.starterType,
      }));
  }

  /** Todos los jugadores han enviado respuesta en la ronda actual */
  allPlayersHaveAnswered(room) {
    if (!room?.activeRound || !room.questionOpen) return false;
    if (room.players.size === 0) return false;
    return room.answers.size === room.players.size;
  }
}

function formatCorrectSummary(r) {
  const p = r.payload;
  const t = r.type;
  if (t === "trivia" && p.options && typeof p.correctIndex === "number") {
    const opt = p.options[p.correctIndex];
    if (!opt) return "";
    if (p.question) {
      return `«${p.question}» — Respuesta correcta: «${opt}».`;
    }
    return `Respuesta correcta: «${opt}».`;
  }
  if ((t === "blur" || t === "music") && p.options && typeof p.correctIndex === "number") {
    const opt = p.options[p.correctIndex];
    return opt ? `El Pokémon correcto era: ${opt}.` : "";
  }
  if (t === "pokedex" && p.correctNumber != null) {
    const name = p.correctPokemonName;
    return name
      ? `Número de Pokédex correcto: ${p.correctNumber} (${name}).`
      : `Número de Pokédex correcto: ${p.correctNumber}.`;
  }
  return "";
}
