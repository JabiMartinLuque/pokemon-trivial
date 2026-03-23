import React from "react";
import { Link } from "react-router-dom";
import { createSocket } from "../lib/socket.js";
import { TimerBar } from "../components/TimerBar.jsx";
import { typeBg } from "../lib/typeColors.js";

const TYPE_LABEL = {
  blur: "¿Quién es?",
  trivia: "Trivial",
  music: "Grito Pokémon",
  pokedex: "Número Pokédex",
};

function playerSpriteUrl(id) {
  if (!id) return "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function RankingRow({ r, highlightId }) {
  const isMe = r.id === highlightId;
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
        isMe ? "bg-poke-blue/40 ring-2 ring-poke-yellow" : "bg-slate-800"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-white/20"
          style={{ background: typeBg(r.starterType) }}
        >
          {r.starterId ? (
            <img src={playerSpriteUrl(r.starterId)} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <span className="text-xs">?</span>
          )}
        </div>
        <span className="truncate font-medium">
          {r.rank}. {r.name}
        </span>
      </div>
      <span className="shrink-0 font-mono text-sm">{r.score}</span>
    </li>
  );
}

export default function Player() {
  const socketRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const [connected, setConnected] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [starters, setStarters] = React.useState([]);
  const [starterId, setStarterId] = React.useState(null);
  const [joined, setJoined] = React.useState(false);
  const [player, setPlayer] = React.useState(null);
  const [phase, setPhase] = React.useState("lobby");
  const [question, setQuestion] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const [roundReveal, setRoundReveal] = React.useState(null);
  const [lobbyPlayers, setLobbyPlayers] = React.useState([]);
  const [ranking, setRanking] = React.useState([]);
  const [finished, setFinished] = React.useState(false);

  React.useEffect(() => {
    playerRef.current = player;
  }, [player]);

  React.useEffect(() => {
    fetch("/api/starters")
      .then((r) => r.json())
      .then((d) => setStarters(d.starters || []))
      .catch(() => setStarters([]));
  }, []);

  React.useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("player_joined", ({ players }) => {
      setLobbyPlayers(players || []);
    });

    s.on("start_game", () => {
      setPhase("playing");
      setFeedback(null);
    });
    s.on("start_question", (data) => {
      setQuestion(data);
      setFeedback(null);
      setRoundReveal(null);
      setPhase("question");
    });
    s.on("end_question", (data) => {
      setRoundReveal(data.reveal || null);
      setPhase("between");
      const pid = playerRef.current?.id;
      const my = data.perPlayer?.find((r) => r.playerId === pid);
      setPlayer((p) => {
        if (!p) return p;
        return { ...p, score: my?.score ?? p.score };
      });
      if (data.reveal?.type === "pokedex" && my) {
        setFeedback({
          points: my.roundPoints,
          correct: my.correct,
          totalScore: my.score,
          pending: false,
        });
        playBeep(my.correct);
      }
    });
    s.on("update_scores", ({ ranking: r }) => {
      setRanking(r || []);
      setPlayer((p) => {
        if (!p) return p;
        const row = r?.find((x) => x.id === p.id);
        return row ? { ...p, score: row.score } : p;
      });
    });
    s.on("answer_feedback", (fb) => {
      if (fb.pending) {
        setFeedback({ pending: true, totalScore: fb.totalScore });
        return;
      }
      setFeedback(fb);
      playBeep(fb.correct);
    });
    s.on("game_finished", ({ ranking: r }) => {
      setRanking(r || []);
      setFinished(true);
      setPhase("done");
    });
    s.on("error_message", ({ message }) => alert(message));
    s.on("host_disconnected", () => {
      alert("El anfitrión se desconectó.");
      setJoined(false);
    });

    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, []);

  const join = (e) => {
    e.preventDefault();
    if (starterId == null) {
      alert("Elige tu Pokémon inicial.");
      return;
    }
    socketRef.current?.emit(
      "join_room",
      { code: code.trim(), name: name.trim(), starterId },
      (res) => {
        if (!res?.ok) {
          alert(res?.error || "No se pudo unir");
          return;
        }
        setPlayer(res.player);
        setLobbyPlayers(res.players || []);
        setJoined(true);
      }
    );
  };

  const submitChoice = (answerIndex) => {
    if (!question?.roomCode) return;
    socketRef.current?.emit(
      "submit_answer",
      { roomCode: question.roomCode, answerIndex },
      (res) => {
        if (!res?.ok && res?.error) alert(res.error);
      }
    );
  };

  const submitNumber = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const value = Number(fd.get("num"));
    if (!question?.roomCode) return;
    socketRef.current?.emit(
      "submit_answer",
      { roomCode: question.roomCode, value },
      (res) => {
        if (!res?.ok && res?.error) alert(res.error);
      }
    );
  };

  if (!joined) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <Link to="/" className="mb-6 text-slate-400">
          ← Inicio
        </Link>
        <h1 className="text-2xl font-bold">Unirse a sala</h1>
        <p className="mt-1 text-sm text-slate-500">
          {connected ? "Conectado" : "Conectando…"}
        </p>
        <form onSubmit={join} className="mt-8 flex flex-col gap-4">
          <label className="block">
            <span className="text-sm text-slate-400">Tu nombre</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-4 text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              placeholder="Ash"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Código de sala</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-4 text-center font-mono text-2xl tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              required
              placeholder="0000"
            />
          </label>
          <div>
            <span className="text-sm text-slate-400">Tu Pokémon inicial</span>
            <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {starters.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStarterId(s.id)}
                  className={`flex flex-col items-center rounded-xl p-2 ring-2 transition ${
                    starterId === s.id
                      ? "ring-poke-yellow ring-offset-2 ring-offset-slate-950"
                      : "ring-transparent hover:bg-slate-800"
                  }`}
                  style={{ background: typeBg(s.type) + "44" }}
                >
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="h-14 w-14 object-contain"
                  />
                  <span className="mt-1 text-center text-[10px] leading-tight text-white/90">
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-poke-yellow py-4 text-lg font-bold text-slate-900"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h2 className="text-center text-2xl font-bold text-poke-yellow">¡Partida terminada!</h2>
        <ol className="mt-6 space-y-2">
          {ranking.map((r) => (
            <RankingRow key={r.id} r={r} highlightId={player?.id} />
          ))}
        </ol>
        <p className="mt-6 text-center text-slate-400">
          Puntos finales: <span className="text-white">{player?.score}</span>
        </p>
        <Link to="/" className="mt-8 block text-center text-poke-blue">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-3 py-4 pb-24">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          {player?.starterId ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-white/20"
              style={{ background: typeBg(player.starterType) }}
            >
              <img
                src={playerSpriteUrl(player.starterId)}
                alt=""
                className="h-9 w-9 object-contain"
              />
            </div>
          ) : null}
          <span className="truncate font-semibold text-poke-yellow">{player?.name}</span>
        </div>
        <span className="shrink-0 font-mono text-amber-200">{player?.score ?? 0} pts</span>
      </div>

      {(phase === "lobby" || (phase === "playing" && !question)) && (
        <div className="mt-8">
          <p className="text-center text-slate-400">Esperando al anfitrión…</p>
          <p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            En la sala
          </p>
          <ul className="mt-3 space-y-2">
            {lobbyPlayers.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-slate-800/90 px-3 py-2"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-white/20"
                  style={{ background: typeBg(p.starterType) }}
                >
                  {p.starterId ? (
                    <img
                      src={playerSpriteUrl(p.starterId)}
                      alt=""
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span className="text-xs">?</span>
                  )}
                </div>
                <span className="truncate font-medium text-slate-100">{p.name}</span>
              </li>
            ))}
          </ul>
          {lobbyPlayers.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-600">Cargando lista…</p>
          )}
        </div>
      )}

      {question && phase === "question" && !feedback && (
        <PlayerQuestion
          key={`${question.roundIndex}-${question.startedAt}`}
          data={question}
          onChoice={submitChoice}
          onSubmitNumber={submitNumber}
        />
      )}

      {phase === "between" && roundReveal?.correctSummary && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
            Respuesta correcta
          </p>
          <p className="mt-1 text-base leading-snug text-white">{roundReveal.correctSummary}</p>
        </div>
      )}

      {feedback && (
        <div className="mt-8 rounded-2xl bg-slate-800 p-6 text-center">
          {feedback?.pending ? (
            <>
              <p className="text-lg font-semibold text-slate-200">Número enviado</p>
              <p className="mt-2 text-sm text-slate-500">Esperando al cierre de la ronda…</p>
            </>
          ) : (
            <>
              {feedback && typeof feedback.correct === "boolean" && (
                <p
                  className={`text-xl font-bold ${
                    feedback.correct ? "text-green-400" : "text-rose-400"
                  }`}
                >
                  {feedback.correct ? "Respuesta correcta" : "Respuesta incorrecta"}
                </p>
              )}
              <p className="mt-2 text-3xl font-black text-amber-300">+{feedback?.points ?? 0}</p>
              <p className="mt-1 text-slate-400">Total: {feedback?.totalScore ?? player?.score}</p>
            </>
          )}
        </div>
      )}

      {ranking.length > 0 && phase !== "question" && (
        <div className="mt-6 rounded-xl border border-slate-700 p-4">
          <p className="text-xs uppercase text-slate-500">Ranking</p>
          <ul className="mt-2 space-y-2 text-sm">
            {ranking.slice(0, 8).map((r) => (
              <RankingRow key={r.id} r={r} highlightId={player?.id} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PlayerQuestion({ data, onChoice, onSubmitNumber }) {
  const { type, durationMs, startedAt, payload, roundIndex, totalRounds } = data;
  const [picked, setPicked] = React.useState(null);

  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    onChoice(i);
  };

  return (
    <div className="mt-2">
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>
          {roundIndex}/{totalRounds}
        </span>
        <span>{TYPE_LABEL[type]}</span>
      </div>
      <TimerBar startedAt={startedAt} durationMs={durationMs} />

      {type === "blur" && (
        <PlayerBlur
          payload={payload}
          startedAt={startedAt}
          durationMs={durationMs}
          onPick={pick}
          picked={picked}
        />
      )}
      {type === "trivia" && (
        <PlayerChoices options={payload.options} onPick={pick} picked={picked} />
      )}
      {type === "music" && (
        <PlayerMusic payload={payload} startedAt={startedAt} onPick={pick} picked={picked} />
      )}
      {type === "pokedex" && <PlayerPokedex payload={payload} onSubmit={onSubmitNumber} />}
    </div>
  );
}

function PlayerBlur({ payload, startedAt, durationMs, onPick, picked }) {
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
    <div className="mt-4">
      <div className="flex justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="max-h-56 w-auto rounded-xl object-contain sm:max-h-64"
            style={{ filter: `blur(${blur}px)` }}
          />
        ) : null}
      </div>
      <PlayerChoices options={options} onPick={onPick} picked={picked} />
    </div>
  );
}

function PlayerChoices({ options, onPick, picked }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options?.map((o, i) => (
        <button
          key={i}
          type="button"
          disabled={picked !== null}
          onClick={() => onPick(i)}
          className={`min-h-[56px] rounded-2xl px-4 py-4 text-left text-base font-bold transition active:scale-[0.98] ${
            picked === i
              ? "bg-poke-yellow text-slate-900 ring-4 ring-amber-300"
              : "bg-slate-800 hover:bg-slate-700"
          } ${picked !== null && picked !== i ? "opacity-40" : ""}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PlayerMusic({ payload, startedAt, onPick, picked }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !payload.audioUrl) return;
    el.currentTime = 0;
    el.play().catch(() => {});
    return () => el.pause();
  }, [payload.audioUrl, startedAt]);

  return (
    <div className="mt-4">
      {payload.audioUrl ? (
        <audio ref={ref} src={payload.audioUrl} className="w-full" controls />
      ) : (
        <p className="text-center text-amber-400">Audio no disponible</p>
      )}
      <PlayerChoices options={payload.options} onPick={onPick} picked={picked} />
    </div>
  );
}

function PlayerPokedex({ payload, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="mt-6">
      {payload.imageUrl ? (
        <img
          src={payload.imageUrl}
          alt=""
          className="mx-auto max-h-52 rounded-xl object-contain"
        />
      ) : null}
      <p className="mt-3 text-center text-sm text-slate-400">{payload.hint}</p>
      <input
        name="num"
        type="number"
        min={1}
        max={1025}
        className="mt-4 w-full rounded-2xl border border-slate-600 bg-slate-900 px-4 py-5 text-center text-3xl font-mono"
        placeholder="??? "
        required
      />
      <button
        type="submit"
        className="mt-4 w-full rounded-2xl bg-poke-blue py-4 text-lg font-bold"
      >
        Enviar número
      </button>
    </form>
  );
}

function playBeep(correct) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = correct ? 880 : 220;
    g.gain.value = 0.08;
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 120);
  } catch {
    /* ignore */
  }
}
