"use server";

import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError } from "@google/genai";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { AppError } from "@/lib/errors";
import { askAssistant, type ChatMessage } from "@/services/assistant";

export async function askAssistantAction(messages: ChatMessage[]): Promise<ActionResult<{ reply: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    try {
      return { reply: await askAssistant(actor, { messages }) };
    } catch (error) {
      // Map provider errors to friendly messages; never leak raw API errors.
      if (error instanceof Anthropic.RateLimitError) throw new AppError("The assistant is busy right now. Try again in a minute.", 429);
      if (error instanceof Anthropic.AuthenticationError) throw new AppError("The AI assistant isn't configured correctly. Please tell an admin.", 503);
      if (error instanceof GeminiApiError) {
        if (error.status === 429) throw new AppError("The assistant is busy right now. Try again in a minute.", 429);
        if (error.status === 400 || error.status === 401 || error.status === 403)
          throw new AppError("The AI assistant isn't configured correctly. Please tell an admin.", 503);
        throw new AppError("The assistant couldn't answer right now. Please try again.", 502);
      }
      if (error instanceof Anthropic.APIError) throw new AppError("The assistant couldn't answer right now. Please try again.", 502);
      throw error;
    }
  });
}
