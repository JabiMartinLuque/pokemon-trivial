import React from "react";
import { Link } from "react-router-dom";
import { createSocket } from "../lib/socket.js";
import { TimerBar } from "../components/TimerBar.jsx";
import { typeBg } from "../lib/typeColors.js";

const TYPE_LABEL = {
  blur: "¿Quién es este Pokémon? (difuminado)",
  trivia: "Trivial Pokémon",
  music: "¿De quién es este grito?",
  pokedex: "Número Pokédex",
};

const MODE_OPTIONS = [
  { id: "blur", label: "Pokémon difuminado" },
  { id: "trivia", label: "Trivial (preguntas JSON)" },
  { id: "music", label: "Grito Pokémon" },
  { id: "pokedex", label: "Número Pokédex" },
];

const MODE_DESCRIPTIONS = {
  blur: "Se muestra la imagen de un Pokémon muy difuminada; el desenfoque baja con el tiempo. Hay que elegir el nombre entre 4 opciones. Puntos por acierto y rapidez.",
  trivia: "Preguntas de texto con 4 opciones (archivos JSON del servidor). Puedes filtrar por dificultad (fácil / media / difícil) y por categorías de tema.",
  music: "Se reproduce el grito del Pokémon (audio de PokéAPI). Adivina cuál de los 4 nombres es el correcto.",
  pokedex: "Solo ves la imagen del Pokémon y debes escribir su número de Pokédex. Ganan puntos quienes se acerquen más al número correcto.",
};

const TRIVIA_OPTIONS = [
  { id: "tipos", label: "Tipos" },
  { id: "stats", label: "Stats" },
  { id: "mecanicas", label: "Mecánicas" },
  { id: "objetos", label: "Objetos" },
];

const TRIVIA_DESCRIPTIONS = {
  tipos: "Debilidades, resistencias, combinaciones de tipos y conocimientos clásicos de tipos elementales.",
  stats: "PS, ataque, defensa, velocidad y cómo influyen en el combate.",
  mecanicas: "Estados alterados, turnos, objetos en combate y reglas del juego.",
  objetos: "Bayas, objetos equipables y efectos típicos en batalla.",
};

const DIFFICULTY_OPTIONS = [
  { id: "easy", label: "Fácil" },
  { id: "medium", label: "Media" },
  { id: "hard", label: "Difícil" },
];

const DIFFICULTY_DESCRIPTIONS = {
  easy: "Preguntas más directas y conceptos básicos.",
  medium: "Nivel intermedio; mezcla de conocimiento general y detalle.",
  hard: "Preguntas más exigentes o con matices de reglas y mecánicas.",
};

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function InfoButton({ title, description, onOpen }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen({ title, description });
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/80 bg-slate-700/80 text-sm font-bold text-slate-200 transition hover:border-amber-400/60 hover:bg-slate-600 hover:text-amber-200"
      title="Información"
      aria-label={`Información: ${title}`}
    >
      i
    </button>
  );
}

function InfoModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="info-modal-title" className="text-lg font-bold text-poke-yellow">
          {open.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{open.description}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-slate-700 py-2.5 font-semibold text-white transition hover:bg-slate-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function Host() {
  const socketRef = React.useRef(null);
  const [infoModal, setInfoModal] = React.useState(null);
  const [connected, setConnected] = React.useState(false);
  const [roomCode, setRoomCode] = React.useState(null);
  const [players, setPlayers] = React.useState([]);
  const [phase, setPhase] = React.useState("setup");
  const [roundCount, setRoundCount] = React.useState(8);
  const [modes, setModes] = React.useState({
    blur: true,
    trivia: true,
    music: true,
    pokedex: true,
  });
  const [triviaCats, setTriviaCats] = React.useState({
    tipos: true,
    stats: true,
    mecanicas: true,
    objetos: true,
  });
  const [triviaDiff, setTriviaDiff] = React.useState({
    easy: true,
    medium: true,
    hard: true,
  });
  const [question, setQuestion] = React.useState(null);
  const [ranking, setRanking] = React.useState([]);
  const [lastResults, setLastResults] = React.useState(null);
  const [winner, setWinner] = React.useState(null);

  React.useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("player_joined", ({ players: p }) => setPlayers(p || []));
    s.on("start_game", () => {
      setPhase("playing");
      setLastResults(null);
    });
    s.on("start_question", (data) => {
      setQuestion(data);
      setPhase("question");
      setLastResults(null);
    });
    s.on("end_question", (data) => {
      setLastResults(data);
      setPhase("results");
    });
    s.on("update_scores", ({ ranking: r }) => {
      setRanking(r || []);
      setPlayers((prev) => {
        if (!r?.length) return prev;
        return prev.map((p) => {
          const row = r.find((x) => x.id === p.id);
          return row ? { ...p, score: row.score } : p;
        });
      });
    });
    s.on("game_finished", ({ ranking: r }) => {
      setWinner(r?.[0] || null);
      setRanking(r || []);
      setPhase("finished");
      setQuestion(null);
    });
    s.on("error_message", ({ message }) => alert(message));

    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, []);

  const createRoom = () => {
    socketRef.current?.emit("create_room", (res) => {
      if (res?.ok) setRoomCode(res.roomCode);
      else alert(res?.error || "No se pudo crear la sala");
    });
  };

  const startGame = () => {
    const enabledModes = MODE_OPTIONS.map((m) => m.id).filter((id) => modes[id]);
    if (enabledModes.length === 0) {
      alert("Activa al menos un tipo de prueba.");
      return;
    }
    const triviaCategories = TRIVIA_OPTIONS.map((c) => c.id).filter((id) => triviaCats[id]);
    const triviaDifficulties = DIFFICULTY_OPTIONS.map((d) => d.id).filter((id) => triviaDiff[id]);
    socketRef.current?.emit(
      "start_game",
      {
        totalRounds: roundCount,
        enabledModes,
        triviaCategories,
        triviaDifficulties,
      },
      (res) => {
        if (!res?.ok) alert(res?.error || "Error");
      }
    );
  };

  const nextRound = () => {
    socketRef.current?.emit("next_round", (res) => {
      if (!res?.ok) alert(res?.error || "Error");
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <InfoModal open={infoModal} onClose={() => setInfoModal(null)} />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="text-slate-400 hover:text-white">
          ← Inicio
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          {connected ? "Conectado" : "Sin conexión"}
        </div>
      </header>

      {!roomCode && (
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold">Crear partida</h2>
          <p className="mt-2 text-slate-400">
            Genera un código para que tus amigos se unan desde /play
          </p>
          <button
            type="button"
            onClick={createRoom}
            className="mt-6 rounded-2xl bg-poke-yellow px-8 py-4 text-lg font-bold text-slate-900"
          >
            Crear sala
          </button>
        </div>
      )}

      {roomCode && phase !== "finished" && (
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Código de sala</p>
              <p className="font-mono text-5xl font-black tracking-widest text-poke-yellow">
                {roomCode}
              </p>
            </div>
            {phase === "setup" && (
              <button
                type="button"
                onClick={startGame}
                disabled={players.length < 1}
                className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white disabled:opacity-40"
              >
                Empezar juego
              </button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 lg:col-span-1">
              <h3 className="font-bold text-slate-300">Jugadores ({players.length}/8)</h3>
              <ul className="mt-3 space-y-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-800/80 px-2 py-2"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-white/20"
                      style={{ background: typeBg(p.starterType) }}
                    >
                      {p.starterId ? (
                        <img
                          src={spriteUrl(p.starterId)}
                          alt=""
                          className="h-11 w-11 object-contain"
                        />
                      ) : (
                        <span className="text-xs">?</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="font-mono text-sm text-amber-300">{p.score} pts</div>
                    </div>
                  </li>
                ))}
                {players.length === 0 && (
                  <li className="text-slate-500">Esperando jugadores…</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 lg:col-span-2">
              {phase === "setup" && (
                <div className="space-y-6">
                  <p className="text-slate-400">
                    Configura la partida y pulsa «Empezar juego» cuando haya jugadores. Pulsa{" "}
                    <span className="font-mono text-slate-300">i</span> junto a cada opción para
                    ver una explicación.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-slate-300">
                      Número de rondas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={roundCount}
                      onChange={(e) =>
                        setRoundCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="mt-1 w-24 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Tipos de prueba</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {MODE_OPTIONS.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-2 pl-3"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={modes[m.id]}
                              onChange={(e) =>
                                setModes((prev) => ({ ...prev, [m.id]: e.target.checked }))
                              }
                            />
                            <span className="text-sm leading-tight">{m.label}</span>
                          </label>
                          <InfoButton
                            title={m.label}
                            description={MODE_DESCRIPTIONS[m.id]}
                            onOpen={setInfoModal}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Dificultad del trivial (si sale trivial)
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Solo se elegirán preguntas cuya dificultad coincida con lo marcado.
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-2 pl-3"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={triviaDiff[d.id]}
                              onChange={(e) =>
                                setTriviaDiff((prev) => ({
                                  ...prev,
                                  [d.id]: e.target.checked,
                                }))
                              }
                            />
                            <span className="text-sm leading-tight">{d.label}</span>
                          </label>
                          <InfoButton
                            title={`Dificultad: ${d.label}`}
                            description={DIFFICULTY_DESCRIPTIONS[d.id]}
                            onOpen={setInfoModal}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Categorías del trivial (si sale trivial)
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {TRIVIA_OPTIONS.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-2 pl-3"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={triviaCats[c.id]}
                              onChange={(e) =>
                                setTriviaCats((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.checked,
                                }))
                              }
                            />
                            <span className="text-sm leading-tight">{c.label}</span>
                          </label>
                          <InfoButton
                            title={`Trivial: ${c.label}`}
                            description={TRIVIA_DESCRIPTIONS[c.id]}
                            onOpen={setInfoModal}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {phase === "question" && question && (
                <HostQuestionView data={question} />
              )}

              {phase === "results" && lastResults && (
                <div>
                  <h3 className="text-xl font-bold text-green-400">Resultados de la ronda</h3>
                  {lastResults.reveal?.correctSummary && (
                    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-left">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                        Respuesta correcta
                      </p>
                      <p className="mt-1 text-base leading-snug text-white">
                        {lastResults.reveal.correctSummary}
                      </p>
                    </div>
                  )}
                  <ul className="mt-4 space-y-2">
                    {lastResults.perPlayer?.map((row) => (
                      <li
                        key={row.playerId}
                        className="flex justify-between rounded-lg bg-slate-800 px-3 py-2"
                      >
                        <span>
                          {row.name}{" "}
                          {row.correct ? (
                            <span className="text-green-400">✓</span>
                          ) : row.missed ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <span className="text-amber-400">·</span>
                          )}
                        </span>
                        <span>+{row.roundPoints} pts</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={nextRound}
                    className="mt-6 w-full rounded-xl bg-poke-blue py-3 font-bold"
                  >
                    Siguiente ronda
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-black text-poke-yellow">¡Fin de la partida!</h2>
          {winner && (
            <p className="mt-4 text-xl">
              Ganador: <span className="font-bold text-white">{winner.name}</span> con{" "}
              {winner.score} pts
            </p>
          )}
          <ol className="mt-8 space-y-2 text-left">
            {ranking.map((r) => (
              <li
                key={r.id}
                className="flex justify-between rounded-xl bg-slate-800 px-4 py-3"
              >
                <span>
                  #{r.rank} {r.name}
                </span>
                <span className="font-mono">{r.score}</span>
              </li>
            ))}
          </ol>
          <Link
            to="/"
            className="mt-8 inline-block rounded-xl bg-slate-700 px-6 py-3 font-semibold"
          >
            Volver al inicio
          </Link>
        </div>
      )}
    </div>
  );
}

function HostQuestionView({ data }) {
  const { type, durationMs, startedAt, roundIndex, totalRounds, payload } = data;
  const label = TYPE_LABEL[type] || type;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Ronda {roundIndex}/{totalRounds}
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">{label}</span>
      </div>
      <TimerBar startedAt={startedAt} durationMs={durationMs} />

      {type === "blur" && (
        <HostBlur payload={payload} startedAt={startedAt} durationMs={durationMs} />
      )}
      {type === "trivia" && <HostTrivia payload={payload} />}
      {type === "music" && (
        <HostMusic payload={payload} startedAt={startedAt} durationMs={durationMs} />
      )}
      {type === "pokedex" && <HostPokedex payload={payload} />}
    </div>
  );
}

function HostBlur({ payload, startedAt, durationMs }) {
  const { imageUrl, options, blurMaxPx } = payload;
  const [blur, setBlur] = React.useState(blurMaxPx || 24);
  React.useEffect(() => {
    const max = blurMaxPx || 24;
    const id = setInterval(() => {
      const e = Date.now() - startedAt;
      setBlur(Math.max(0, max * (1 - e / durationMs)));
    }, 40);
    return () => clearInterval(id);
  }, [startedAt, durationMs, blurMaxPx]);

  return (
    <div className="mt-6">
      <div className="mx-auto flex max-w-md justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="max-h-72 rounded-2xl object-contain"
            style={{ filter: `blur(${blur}px)` }}
          />
        ) : (
          <p className="text-slate-500">Sin imagen</p>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {options?.map((o, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-600 bg-slate-800 py-4 text-center font-semibold"
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function HostTrivia({ payload }) {
  return (
    <div className="mt-6">
      <p className="text-xl font-bold md:text-2xl">{payload.question}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {payload.options?.map((o, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-600 bg-slate-800 py-4 text-center"
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function HostMusic({ payload, startedAt, durationMs }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !payload.audioUrl) return;
    el.currentTime = 0;
    el.play().catch(() => {});
    return () => {
      el.pause();
    };
  }, [payload.audioUrl, startedAt]);

  return (
    <div className="mt-6 text-center">
      {payload.audioUrl ? (
        <audio ref={ref} src={payload.audioUrl} className="mx-auto w-full max-w-md" controls />
      ) : (
        <p className="text-amber-400">Sin audio (cristal no disponible)</p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {payload.options?.map((o, i) => (
          <div key={i} className="rounded-xl border border-slate-600 bg-slate-800 py-4">
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function HostPokedex({ payload }) {
  return (
    <div className="mt-6 text-center">
      {payload.imageUrl ? (
        <img
          src={payload.imageUrl}
          alt=""
          className="mx-auto max-h-72 object-contain"
        />
      ) : null}
      <p className="mt-4 text-slate-400">{payload.hint}</p>
    </div>
  );
}
