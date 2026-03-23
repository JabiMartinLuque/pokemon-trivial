import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || "0.0.0.0",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  roundsPerGame: Number(process.env.ROUNDS_PER_GAME) || 8,
};
