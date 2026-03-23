import { RoomManager } from "../game/RoomManager.js";

const manager = new RoomManager();

const questionTimers = new Map();

export function clearQuestionTimer(code) {
  if (questionTimers.has(code)) {
    clearTimeout(questionTimers.get(code));
    questionTimers.delete(code);
  }
}

export function getRoomManager() {
  return manager;
}

export function registerSocketHandlers(io, socket) {
  socket.data.isHost = false;
  socket.data.roomCode = null;
  socket.data.playerId = null;

  socket.on("create_room", async (ack) => {
    try {
      const code = manager.createRoom(socket.id);
      socket.data.isHost = true;
      socket.data.roomCode = code;
      await socket.join(`room:${code}`);
      if (typeof ack === "function") ack({ ok: true, roomCode: code });
      else socket.emit("room_created", { roomCode: code });
    } catch (e) {
      const msg = e?.message || "Error al crear sala";
      if (typeof ack === "function") ack({ ok: false, error: msg });
      else socket.emit("error_message", { message: msg });
    }
  });

  socket.on("join_room", async (payload, ack) => {
    const code = String(payload?.code || "").trim();
    const name = payload?.name;
    const starterId = payload?.starterId;
    const result = manager.joinRoom(code, socket.id, name, starterId);
    if (result.error) {
      if (typeof ack === "function") ack({ ok: false, error: result.error });
      return;
    }
    socket.data.isHost = false;
    socket.data.roomCode = code;
    socket.data.playerId = result.player.id;
    await socket.join(`room:${code}`);
    const room = manager.getRoom(code);
    if (typeof ack === "function") {
      ack({
        ok: true,
        player: result.player,
        players: manager.playerList(room),
      });
    }
    io.to(`room:${code}`).emit("player_joined", {
      players: manager.playerList(room),
    });
  });

  socket.on("start_game", async (payload, ack) => {
    const code = socket.data.roomCode;
    const room = manager.getRoom(code);
    if (!room || room.hostSocketId !== socket.id) {
      const err = "Solo el host puede iniciar la partida";
      if (typeof ack === "function") ack({ ok: false, error: err });
      return;
    }
    clearQuestionTimer(code);
    const result = await manager.startGame(code, payload || {});
    if (result.error) {
      if (typeof ack === "function") ack({ ok: false, error: result.error });
      return;
    }
    if (typeof ack === "function") ack({ ok: true });
    io.to(`room:${code}`).emit("start_game", {
      totalRounds: room.totalRounds,
    });
    io.to(`room:${code}`).emit("start_question", {
      ...result.public,
      roomCode: code,
    });
    scheduleQuestionEnd(io, code);
  });

  socket.on("submit_answer", (payload, ack) => {
    const code = socket.data.roomCode || payload?.roomCode;
    const result = manager.submitAnswer(code, socket.id, payload);
    if (result.error) {
      if (typeof ack === "function") ack({ ok: false, error: result.error });
      return;
    }
    const room = manager.getRoom(code);
    if (typeof ack === "function") {
      ack({
        ok: true,
        pending: result.pending,
        points: result.points,
        correct: result.correct,
        totalScore: result.totalScore,
      });
    }
    if (result.pending) {
      socket.emit("answer_feedback", {
        pending: true,
        totalScore: result.totalScore,
      });
    } else {
      socket.emit("answer_feedback", {
        points: result.points,
        correct: result.correct,
        totalScore: result.totalScore,
      });
      if (room) {
        io.to(`room:${code}`).emit("update_scores", {
          ranking: manager.ranking(room),
        });
      }
    }
    const roomAfter = manager.getRoom(code);
    if (roomAfter && manager.allPlayersHaveAnswered(roomAfter)) {
      clearQuestionTimer(code);
      endQuestionEmit(io, code);
    }
  });

  socket.on("next_round", async (ack) => {
    const code = socket.data.roomCode;
    const room = manager.getRoom(code);
    if (!room || room.hostSocketId !== socket.id) {
      const err = "Solo el host puede avanzar";
      if (typeof ack === "function") ack({ ok: false, error: err });
      return;
    }
    if (room.phase !== "results") {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Espera a los resultados de la ronda" });
      }
      return;
    }
    clearQuestionTimer(code);
    const result = await manager.startNextQuestion(code);
    if (result?.error) {
      if (typeof ack === "function") ack({ ok: false, error: result.error });
      return;
    }
    if (typeof ack === "function") ack({ ok: true });
    if (result?.event === "game_finished") {
      io.to(`room:${code}`).emit("game_finished", {
        ranking: result.ranking,
      });
      return;
    }
    io.to(`room:${code}`).emit("start_question", {
      ...result.public,
      roomCode: code,
    });
    scheduleQuestionEnd(io, code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = manager.getRoom(code);
    if (socket.data.isHost) {
      if (room) {
        clearQuestionTimer(code);
        io.to(`room:${code}`).emit("host_disconnected", {});
        manager.deleteRoom(code);
      }
      return;
    }
    manager.removePlayer(socket.id);
    const r = manager.getRoom(code);
    if (r) {
      io.to(`room:${code}`).emit("player_joined", {
        players: manager.playerList(r),
      });
    }
  });
}

function scheduleQuestionEnd(io, code) {
  const room = getRoomManager().getRoom(code);
  if (!room?.activeRound) return;
  const d = room.activeRound.durationMs + 800;
  clearQuestionTimer(code);
  const t = setTimeout(() => {
    questionTimers.delete(code);
    endQuestionEmit(io, code);
  }, d);
  questionTimers.set(code, t);
}

function endQuestionEmit(io, code) {
  const mgr = getRoomManager();
  const room = mgr.getRoom(code);
  if (!room?.activeRound) return;

  const data = mgr.endQuestionAndScore(code);
  if (!data) return;

  io.to(`room:${code}`).emit("end_question", {
    reveal: data.reveal,
    perPlayer: data.perPlayer,
    elapsed: data.elapsed,
  });

  io.to(`room:${code}`).emit("update_scores", {
    ranking: data.ranking,
  });
}
