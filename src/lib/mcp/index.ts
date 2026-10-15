import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPeople from "./tools/list-people";
import listRecentWords from "./tools/list-recent-words";
import listImportantDates from "./tools/list-important-dates";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "encouraging-words",
  title: "Encouraging Words",
  version: "0.1.0",
  instructions: "Read-only tools for Encouraging Words: see your people, important dates, and recently sent words.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPeople, listRecentWords, listImportantDates],
});
