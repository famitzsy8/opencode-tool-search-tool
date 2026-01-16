import z from "zod"
import { Tool } from "./tool"
import { ToolCatalog } from "./catalog"
import { Session } from "../session"

export const ToolSearchTool = Tool.define("tool_search", {
  description: `Search for available tools by name, description, or capability. Use this whenever you hit limitations of your abilities.

Examples:
- "search for all the files in the subdirectory XYZ" --> tool_search("search")
- "list all the files in ../src" --> tool_search("list files")
- "find all issues in repository xxx/yy" --> tool_search("find issues")

How NOT to Use It:

- "search for all the files in the subdirectory XYZ" --> tool_search("XYZ")
- "list all the files in ../src" --> tool_search("../src")
- "find all issues in repository xxx/yy" --> tool_search("xxx/yyy")`,

  parameters: z.object({
    query: z.string().describe("Search query (keywords or patterns)"),
    category: z
      .enum(["all", "builtin", "mcp", "plugin"])
      .optional()
      .describe("Filter by tool source"),
  }),

  async execute(args, ctx) {
    const results = ToolCatalog.search(args.query, {
      limit: 5,
      source: args.category === "all" ? undefined : args.category,
    })

    if (results.length === 0) {
      return {
        title: "No tools found",
        metadata: {
          query: args.query,
          count: 0,
          tools: [] as string[],
          displayOutput: "No tools found",
        },
        output: `No tools found matching "${args.query}". Try a different search term.`,
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
        query: args.query,
        count: results.length,
        tools: toolNames,
        displayOutput: toolNames.join("\n"),
      },
      output: `Now you can also use the following tools: ${toolNames.join(", ")}`,
    }
  },
})
