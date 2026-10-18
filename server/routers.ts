import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const sendAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function allowSend(ip: string): boolean {
  const now = Date.now();
  if (sendAttempts.size > 5_000) {
    for (const [key, attempt] of sendAttempts) {
      if (attempt.resetAt <= now) sendAttempts.delete(key);
    }
  }
  const current = sendAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    sendAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  telegram: router({
    status: publicProcedure.query(() => ({
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    })),
    send: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(4096).refine(value => value.trim().length > 0, "Scrivi un messaggio prima di inviarlo."),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
        if (!allowSend(ip)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Hai inviato diversi messaggi. Attendi un minuto e riprova." });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!botToken || !chatId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L'invio a Telegram non è ancora configurato. Riprova più tardi." });
        }

        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: input.message }),
            signal: AbortSignal.timeout(10_000),
          });
          const result = await response.json().catch(() => null) as { ok?: boolean } | null;
          if (!response.ok || result?.ok !== true) {
            throw new Error("Telegram rejected the message");
          }
          return { success: true } as const;
        } catch {
          throw new TRPCError({ code: "BAD_GATEWAY", message: "Non siamo riusciti a consegnare il messaggio. Riprova tra poco." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
