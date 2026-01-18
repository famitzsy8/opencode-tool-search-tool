import z from "zod"
import { Tool } from "./tool"
import { ToolCatalog } from "./catalog"
import { Session } from "../session"

export const ToolSearchRegexTool = Tool.define("tool_search_regex", {
  description: `Search for available tools using a regex pattern. Matches against tool names and descriptions (case-insensitive).

Examples:
- tool_search_regex("github.*issue") --> finds tools with "github" followed by "issue"
- tool_search_regex("^get") --> finds tools starting with "get"
- tool_search_regex("file|directory") --> finds tools mentioning "file" or "directory"`,

  parameters: z.object({
    pattern: z.string().describe("Regex pattern to match against tool names and descriptions"),
    category: z
      .enum(["all", "builtin", "mcp", "plugin"])
      .optional()
      .describe("Filter by tool source"),
  }),

  async execute(args, ctx) {
    let results: ReturnType<typeof ToolCatalog.searchRegex>

    try {
      results = ToolCatalog.searchRegex(args.pattern, {
        limit: 10,
        source: args.category === "all" ? undefined : args.category,
      })
    } catch (e) {
      return {
        title: "Invalid regex",
        metadata: {
          pattern: args.pattern,
          count: 0,
          tools: [] as string[],
          displayOutput: `Invalid regex pattern: ${args.pattern}`,
        },
        output: `Invalid regex pattern: "${args.pattern}". Please provide a valid regex.`,
      }
    }

    if (results.length === 0) {
      return {
        title: "No tools found",
        metadata: {
          pattern: args.pattern,
          count: 0,
          tools: [] as string[],
          displayOutput: "No tools found",
        },
        output: `No tools found matching pattern "${args.pattern}". Try a different regex.`,
      }
    }

    Session.addDiscoveredTools(
      ctx.sessionID,
      results.map((r) => r.id),
    )

    const toolNames = results.map((r) => r.id)

    return {
      title: `Found ${results.length} tools`,
      metadata: {
        pattern: args.pattern,
        count: results.length,
        tools: toolNames,
        displayOutput: toolNames.join("\n"),
      },
      output: `Now you can also use the following tools: ${toolNames.join(", ")}`,
    }
  },
})
