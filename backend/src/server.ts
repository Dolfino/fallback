import { pathToFileURL } from "node:url";
import { buildServer } from "./app";

const host = process.env.PLANNER_BACKEND_HOST ?? "0.0.0.0";
const port = Number(process.env.PLANNER_BACKEND_PORT ?? 3000);

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  const app = await buildServer();

  try {
    await app.listen({ host, port });
    app.log.info(`Planner backend running on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
