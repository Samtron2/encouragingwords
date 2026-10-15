import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_people",
  title: "List people",
  description: "List the people the signed-in user encourages, with whether email or phone is on file.",
  inputSchema: { search: z.string().optional().describe("Optional name filter.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    let q = supabaseForUser(ctx)
      .from("recipients")
      .select("id, name, email, phone, last_contacted_at")
      .order("name")
      .limit(200);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const people = (data ?? []).map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? "",
      email: (r.email as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      last_contacted_at: (r.last_contacted_at as string | null) ?? null,
    }));
    return {
      content: [{ type: "text", text: people.length ? people.map((p) => `${p.name} (${p.id})`).join("\n") : "No people yet." }],
      structuredContent: { people },
    };
  },
});
