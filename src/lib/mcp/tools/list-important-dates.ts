import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_important_dates",
  title: "List important dates",
  description: "List the signed-in user's saved important dates (birthdays, anniversaries and more).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("important_dates")
      .select("id, name, occasion_type, month, day")
      .order("month")
      .order("day");
    if (error) throw new ToolError(error.message);
    const dates = (data ?? []).map((d) => ({
      id: d.id as string,
      name: d.name as string,
      occasion: d.occasion_type as string,
      month: d.month as number,
      day: d.day as number,
    }));
    return {
      content: [{ type: "text", text: dates.length ? dates.map((d) => `${d.month}/${d.day} ${d.name} (${d.occasion})`).join("\n") : "No important dates saved." }],
      structuredContent: { dates },
    };
  },
});
