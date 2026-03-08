import "dotenv/config"; // Must be first — loads env vars before any other import
import serverless from "serverless-http";
import { app } from "../../server/src/app";

// app.ts calls ensureSchema() at module load time
// so dotenv must be configured before the import above.

export const handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
