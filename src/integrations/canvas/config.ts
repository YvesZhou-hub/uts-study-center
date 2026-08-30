import { z } from "zod";
import { isIP } from "node:net";
import { DEFAULT_CANVAS_BASE_URL } from "./constants";

export { DEFAULT_CANVAS_BASE_URL };

const canvasConfigSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), { message: "Canvas must use HTTPS" })
    .refine((value) => isPublicHostname(new URL(value).hostname), {
      message: "Canvas host must be a public hostname",
    }),
  accessToken: z.string().min(1),
});

export type CanvasConnectionConfig = z.infer<typeof canvasConfigSchema>;

export function parseCanvasConfig(input: unknown): CanvasConnectionConfig {
  return canvasConfigSchema.parse(input);
}

function isPublicHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    isIP(normalized) === 0 &&
    normalized !== "localhost" &&
    !normalized.endsWith(".localhost") &&
    !normalized.endsWith(".local")
  );
}
