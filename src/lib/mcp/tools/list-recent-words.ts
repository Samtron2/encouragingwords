import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_words",
  title: "List recent words",
  description: "List encouraging messages the signed-in user recently sent, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many to return (default 10).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("messages")
      .select("id, message_text, delivery_method, status, sent_at, recipients(name)")
      .order("sent_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) throw new ToolError(error.message);
    const words = (data ?? []).map((m: any) => ({
      id: String(m.id),
      recipient: (m.recipients?.name as string | undefined) ?? null,
      message: String(m.message_text),
      method: String(m.delivery_method),
      status: String(m.status),
      sent_at: String(m.sent_at),
    }));
    return {
      content: [{ type: "text", text: words.length ? words.map((w) => `${w.sent_at.slice(0, 10)} to ${w.recipient ?? "someone"}: ${w.message}`).join("\n") : "No words sent yet." }],
      structuredContent: { words },
    };
  },
});
