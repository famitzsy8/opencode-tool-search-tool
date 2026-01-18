# OpenCode: Tool Search Fork

This is a fork to implement a Tool Search Tool for OpenCode, mimicking [Claude's Tool Search Tool ](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool). Such a tool allows for two main things:

- Keeping context free of tool descriptions and schemas. Especially helpful for local LLM users that seek to save VRAM by keeping context windows small
- Give agents up to 10000 tools to work with, with normal context usage. Potentially enables agents with unprecendented power and ability

## Implementation

For the tool search tool, we built a `Catalog` system, where each session can add `CatalogEntry`s to its own tool set. Each `CatalogEntry` corresponds to an available tool (built-in or MCP) that is either loaded by default, or has `deferLoading` set to `true`. Built-in and plugin tools are loaded via the native `ToolRegistry.all()` getter-function, and the MCP tools come from `MCP.toolsMeta()`. All the tools are deferred for loading by default, except for the tool search tools (set via the `DEFAULT_CORE_TOOLS` flag internally), but this can be configured in the your `opencode` installation's config directory (see "How To Run").

There are two versions of the tool search tool loaded by default: **BM25** tool search and **RegEx** tool search, in the spirit of Claude's existing implementation.

### BM25 Tool Search

The BM25 tool search tool is loaded as the `tool_search` tool and resides in (`src/tool/tool-search.ts`). Given a query, it uses BM25's ranking technique to search for tools that have a (case-insensitive) keyword matching in their search. For more information look up the [Wikipedia page](https://en.wikipedia.org/wiki/Okapi_BM25) that details how the potential results of a query get scored/ranked.

We set the default parameters to `k1 = 0.9` and `b = 0.4`. Both are relatively low values (from common middle-term values of `k1 = 1.5` and `b = 0.75`), with the rationale that a low `k1` value doesn't emphasize the frequency of the searched term in the query that much, encouraging "semantic density". The low `b` value is chosen such that longer tool descriptions aren't agressively normalized and hidden when searching. 

These values were specifically chosen for **Small Language Models (SLMs)** that tend to send vaguer descriptions of the tools they want to search for. If the model you are working with is highly capable, and writes very specific queries for large sets of tools, we encourage you to increase the `k1` value and play around with the `b` value such that the results fit your context efficiency needs.

### Regex Tool Search

As an alternative to BM25, we have the **Regex** tool search tool, that allows the agent to search for tools with a regular expression (case-insensitive). It returns all the matches to the **names and descriptions** of the tools. This is for queries where agents have a more specific idea of what they are searching for, and differs from BM25 in the sense that not term frequency but term composition is important.

Currently, two tools are load, allowing the agent to search for a tool and its description. For more information on how BM25 works check out the 

## How To Run

1. Tools, that are always loaded into context

In `~/.config/opencode/opencode.json` add the following lines:

```json
    "toolSearch": {
      "alwaysLoad": ["read", "write", "edit"]
    },
```
This allows the agent to be aware about its ability to read, write and edit a file from the very beginning.

2. Start the development server to use this forked version of OpenCode

```bash
bun run dev
```