import { ToolRegistry } from "./registry"
import { MCP } from "../mcp"
import { Config } from "../config/config"
import { BM25 } from "../search/bm25"
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
  const DEFAULT_CORE_TOOLS = ["tool_search", "tool_search_regex", "invalid"]

  let catalog: CatalogEntry[] = []
  let searchIndex: BM25.Index<CatalogEntry> | null = null

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

    // Build BM25 search index
    searchIndex = BM25.createIndex(catalog, (entry) => [entry.name, entry.description])
  }

  export function search(query: string, opts?: { limit?: number; source?: string }): CatalogEntry[] {
    if (!searchIndex || catalog.length === 0) return []

    const results = BM25.search(searchIndex, query, opts?.limit ?? 5)

    return results
      .filter((r) => !opts?.source || r.item.source === opts.source)
      .map((r) => r.item)
  }

  export function searchRegex(
    pattern: string,
    opts?: { limit?: number; source?: string },
  ): CatalogEntry[] {
    if (catalog.length === 0) return []

    const regex = new RegExp(pattern, "i")
    const limit = opts?.limit ?? 5

    return catalog
      .filter((entry) => {
        if (opts?.source && entry.source !== opts.source) return false
        return regex.test(entry.name) || regex.test(entry.description)
      })
      .slice(0, limit)
  }

  export function get(id: string): CatalogEntry | undefined {
    return catalog.find((e) => e.id === id)
  }
}
