import { z } from "zod";

const schema = z.object({
  API_URL: z.url().default("http://localhost:8000"),
});

/** Validated environment. The only place `process.env` is read. */
export function getEnv(): z.infer<typeof schema> {
  return schema.parse({ API_URL: process.env["API_URL"] });
}
