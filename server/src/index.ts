import dotenv from "dotenv";
dotenv.config();

// app.ts calls ensureSchema() at module level, so dotenv MUST be loaded first
import { app } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
