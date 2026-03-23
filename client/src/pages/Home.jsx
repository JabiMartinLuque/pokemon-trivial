import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-poke-yellow drop-shadow-lg md:text-5xl">
          PokéQuiz
        </h1>
        <p className="mt-2 text-slate-400">
          Trivial multijugador estilo Kahoot con datos de PokéAPI
        </p>
      </div>
      <div className="flex w-full flex-col gap-4">
        <Link
          to="/host"
          className="rounded-2xl bg-poke-yellow px-6 py-4 text-center text-lg font-bold text-slate-900 shadow-lg transition hover:brightness-110 active:scale-[0.98]"
        >
          Soy el anfitrión (pantalla grande)
        </Link>
        <Link
          to="/play"
          className="rounded-2xl border-2 border-poke-blue bg-poke-blue/20 px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-poke-blue/30"
        >
          Unirme como jugador
        </Link>
      </div>
      <p className="text-center text-xs text-slate-500">
        Abre el anfitrión en la TV o PC; los jugadores entran desde el móvil con el
        código de sala.
      </p>
    </div>
  );
}
