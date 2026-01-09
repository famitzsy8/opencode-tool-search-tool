import fuzzysort from "fuzzysort"
import { ToolRegistry } from "./registry"
import { MCP } from "../mcp"
import { Config } from "../config/config"
import z from "zod"
import type { JSONSchema7 } from "ai"

export namespace ToolCatalog {
  export interface CatalogEntry {
    id: string
    name: string
    description: string
    parameters: string[]
    source: "builtin" | "mcp" | "plugin"
    mcpServer?: string
    deferLoading: boolean
  }

  // Default core tools that are always loaded (never deferred)
  const DEFAULT_CORE_TOOLS = ["tool_search", "invalid"]

  let catalog: CatalogEntry[] = []

  function extractParamNames(schema: z.ZodType): string[] {
    if (schema instanceof z.ZodObject) {
      return Object.keys(schema.shape)
    }
    return []
  }

  export async function init() {
    await rebuild()
  }

  export async function rebuild() {
    catalog = []
    const config = await Config.get()
    const toolSearchConfig = config.toolSearch

    // Determine which tools should always be loaded
    const alwaysLoad = new Set([
      ...DEFAULT_CORE_TOOLS,
      ...(toolSearchConfig?.alwaysLoad ?? []),
    ])

    // Built-in tools: defer by default unless in alwaysLoad
    for (const tool of await ToolRegistry.all()) {
      const initialized = await tool.init()
      const shouldDefer = !alwaysLoad.has(tool.id)

      catalog.push({
        id: tool.id,
        name: tool.id,
        description: initialized.description,
        parameters: extractParamNames(initialized.parameters),
        source: "builtin",
        deferLoading: shouldDefer,
      })
    }

    // MCP tools
    const mcpConfig = config.mcp ?? {}
    for (const [server, tools] of Object.entries(await MCP.toolsMeta())) {
      const serverConfig = mcpConfig[server]
      const serverDeferLoading = serverConfig && "deferLoading" in serverConfig ? serverConfig.deferLoading ?? true : true

      for (const tool of tools) {
        const sanitizedServer = server.replace(/[^a-zA-Z0-9_-]/g, "_")
        const sanitizedName = tool.name.replace(/[^a-zA-Z0-9_-]/g, "_")

        const inputSchema = tool.inputSchema as JSONSchema7
        const properties = inputSchema.properties ?? {}
        const parameterNames = Object.keys(properties)

        catalog.push({
          id: `${sanitizedServer}_${sanitizedName}`,
          name: tool.name,
          description: tool.description,
          parameters: parameterNames,
          source: "mcp",
          mcpServer: server,
          deferLoading: serverDeferLoading,
        })
      }
    }
  }

  export function search(query: string, opts?: { limit?: number; source?: string }): CatalogEntry[] {
    if (catalog.length === 0) return []
    const limit = opts?.limit ?? 5

    const results = fuzzysort.go(query, catalog, {
      keys: ["name", "description"],
      limit,
      threshold: -10000,
    })

    return results
      .filter((r) => !opts?.source || r.obj.source === opts.source)
      .map((r) => r.obj)
  }

  export function get(id: string): CatalogEntry | undefined {
    return catalog.find((e) => e.id === id)
  }
}
