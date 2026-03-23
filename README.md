# PokéQuiz — Kahoot casero con Pokémon

Aplicación multijugador en tiempo real: un **anfitrión** (pantalla grande) crea una sala con código numérico; los **jugadores** entran desde el móvil o PC, responden minijuegos y compiten por puntos. Los datos de Pokémon provienen de [PokéAPI](https://pokeapi.co/) consumidos **solo desde el backend**.

## Estructura

- `server/` — Node.js, Express, Socket.IO, lógica de salas y puntuaciones
- `client/` — React, Vite, TailwindCSS

## Requisitos

- Node.js 18+ (recomendado LTS)

## Desarrollo (dos terminales)

**1. Arranca primero el backend** (si no hay servidor, el cliente no podrá conectar y verás errores de WebSocket).

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Debe mostrar algo como `Servidor en http://0.0.0.0:3001`. El puerto por defecto es `3001` (`HOST` y `PORT` en `.env`).

**2. Luego el frontend**

```bash
cd client
npm install
npm run dev
```

El archivo `client/.env.development` define `VITE_SOCKET_URL=http://localhost:3001` para que Socket.IO se conecte **directamente** al backend. Así se evitan fallos del proxy WebSocket de Vite (`ECONNABORTED`, `ws proxy socket error`).

Abre **`http://localhost:5173`**.

### Cómo probar la app en local

1. **Anfitrión:** en el navegador ve a `/` → «Soy el anfitrión» → **Crear sala** y anota el código de 4 dígitos.
2. **Jugadores:** en **otra pestaña**, ventana de incógnito u otro navegador, abre `http://localhost:5173` → «Unirme como jugador» → nombre + código.
3. Vuelve a la pestaña del anfitrión y pulsa **Empezar juego** cuando haya al menos un jugador unido.

Puedes tener varias pestañas de «jugador» para simular varios participantes.

## 🐳 Producción con Docker (Recomendado)

La forma más fácil de desplegar en una máquina virtual. Incluye Nginx, Express y todo lo necesario.

```bash
# Construir y levantar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

**Documentación completa**: [`DOCKER_QUICKSTART.md`](./DOCKER_QUICKSTART.md) y [`ORACLE_CLOUD_SETUP.md`](./ORACLE_CLOUD_SETUP.md) 

---

## Producción en una máquina virtual (sin Docker)

Objetivo: un solo proceso sirve la API, WebSockets y los archivos estáticos del frontend.

### 1. Variables de entorno (servidor)

Copia `server/.env.example` a `server/.env` y ajusta:

| Variable        | Descripción |
|----------------|-------------|
| `PORT`         | Puerto HTTP (ej. `3001`) |
| `HOST`         | Debe ser `0.0.0.0` para aceptar conexiones desde la red |
| `CLIENT_URL`   | URL base del frontend (referencia/documentación; CORS usa `origin: true`) |
| `ROUNDS_PER_GAME` | Rondas por partida (por defecto `8`) |

### 2. Build del frontend

```bash
cd client
npm install
npm run build
```

Se genera `client/dist/`.

### 3. Arranque

Desde la raíz del repo:

```bash
cd server
npm install
npm start
```

Express sirve:

- Archivos estáticos de `client/dist` (SPA React)
- `server/public` (p. ej. audios opcionales en `public/audio/`)

Abre en el navegador: `http://<IP_DE_LA_VM>:3001` (o el puerto que hayas configurado).

### 4. Firewall y red

- Abre el puerto TCP del servidor (ej. `3001`) en el firewall de la VM y en el grupo de seguridad (AWS/Azure/etc.).
- Los jugadores deben poder alcanzar la misma URL/IP.

### 5. Frontend en otro dominio o puerto

Si sirves el cliente por separado (por ejemplo solo archivos estáticos en Nginx), define en el cliente:

```env
VITE_SOCKET_URL=http://IP_O_DOMINIO:PUERTO
```

y vuelve a ejecutar `npm run build`.

## Minijuegos

1. **Pokémon difuminado** — Sprite de PokéAPI con blur que baja con el tiempo; 4 opciones; puntos por acierto y rapidez.
2. **Trivial** — Preguntas en JSON (`server/data/questions/*.json`); categorías: tipos, stats, mecánicas, objetos.
3. **Grito / música** — Se reproduce el **grito** del Pokémon (URL de PokéAPI); 4 nombres; puedes ampliar con archivos en `server/public/audio/` y lógica propia.
4. **Número Pokédex** — Imagen del Pokémon; el jugador escribe un número; puntos por precisión y tiempo.

## Ampliar preguntas

Añade archivos `.json` en `server/data/questions/` con arrays de objetos:

```json
{
  "question": "Texto",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "difficulty": "easy",
  "category": "tipos"
}
```

`correct` es el índice 0–3 de la opción correcta.

## Eventos Socket.IO (referencia)

- `create_room` — Crea sala; el host recibe `roomCode`
- `join_room` — `{ code, name }`
- `player_joined` — Lista actualizada de jugadores
- `start_game` — Solo el host
- `start_question` — Payload público de la ronda (sin respuestas secretas)
- `submit_answer` — `{ answerIndex }` o `{ value }` (Pokédex)
- `end_question` — Revelación y puntos de la ronda
- `update_scores` — Ranking
- `next_round` — Solo el host, tras resultados (también avanza solo tras unos segundos)

## Licencia

Proyecto de ejemplo educativo. Pokémon es marca registrada de Nintendo/Game Freak/Creatures.
