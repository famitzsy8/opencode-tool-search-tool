# OpenCode: Tool Search Fork

This is a fork to implement a Tool Search Tool for OpenCode, mimicking [Claude's Tool Search Tool ](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool). Such a tool allows for two main things:

- Keeping context free of tool descriptions and schemas. Especially helpful for local LLM users that seek to save VRAM by keeping context windows small
- Give agents up to 10000 tools to work with, with normal context usage. Potentially enables agents with unprecendented power and ability

## Current State

Currently, only a simple Fuzzysearch version is in place, allowing the agent to search for a tool and its description. Fuzzysearch returns matches with the query that are "similar" (mostly based on edit distance). We return at most 5 results/tools from the search.

## How To Run

1. Tools, that are always loaded into context

In `~/.config/opencode/opencode.json` add the following lines:

```json
    "toolSearch": {
      "alwaysLoad": ["read", "write", "edit"]
    },
```
This allows the agent to be aware about its ability to read, write and edit a file from the very beginning.

2. Start the development server

```bash
bun run dev
```