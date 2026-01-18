#!/usr/bin/env bun
/**
 * CLI tool to test regex search implementation
 * Usage: bun run src/search/test-regex-cli.ts
 */

import * as readline from "readline"

// Sample tool inventory (same as BM25 test)
const sampleTools = [
  { id: "read", name: "read", description: "Read contents of a file from the filesystem" },
  { id: "write", name: "write", description: "Write contents to a file on the filesystem" },
  { id: "edit", name: "edit", description: "Edit a file by replacing text with new content" },
  { id: "glob", name: "glob", description: "Find files matching a glob pattern in the directory" },
  { id: "grep", name: "grep", description: "Search for patterns in code using regex" },
  { id: "bash", name: "bash", description: "Execute shell commands in the terminal" },
  { id: "task", name: "task", description: "Launch a subagent to handle complex tasks autonomously" },
  { id: "webfetch", name: "webfetch", description: "Fetch content from a URL and process it" },
  { id: "websearch", name: "websearch", description: "Search the web for information" },
  { id: "tool_search", name: "tool_search", description: "Search for available tools by name or capability" },
  { id: "github_list_issues", name: "list_issues", description: "List issues from a GitHub repository" },
  { id: "github_create_issue", name: "create_issue", description: "Create a new issue in a GitHub repository" },
  { id: "github_get_pull_request", name: "get_pull_request", description: "Get details of a pull request" },
  { id: "perplexity_search", name: "search", description: "Search using Perplexity AI for answers" },
  { id: "slack_send_message", name: "send_message", description: "Send a message to a Slack channel" },
  { id: "slack_list_channels", name: "list_channels", description: "List all Slack channels" },
  { id: "notion_create_page", name: "create_page", description: "Create a new page in Notion" },
  { id: "notion_search", name: "search", description: "Search for pages in Notion database" },
  { id: "linear_create_issue", name: "create_issue", description: "Create a new issue in Linear" },
  { id: "linear_list_issues", name: "list_issues", description: "List issues from Linear project" },
]

function searchRegex(pattern: string, limit = 10): Array<{ item: typeof sampleTools[0]; matched: string }> {
  try {
    const regex = new RegExp(pattern, "i")
    return sampleTools
      .map((tool) => {
        const nameMatch = tool.name.match(regex)
        const descMatch = tool.description.match(regex)
        if (nameMatch || descMatch) {
          return {
            item: tool,
            matched: nameMatch ? `name: "${nameMatch[0]}"` : `desc: "${descMatch![0]}"`,
          }
        }
        return null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, limit)
  } catch (e) {
    throw new Error(`Invalid regex: ${(e as Error).message}`)
  }
}

console.log("=== Regex Search Test CLI ===")
console.log(`Loaded ${sampleTools.length} tools`)
console.log("")
console.log("Type a regex pattern and press Enter. Type 'quit' to exit.")
console.log("Type 'list' to see all tools.")
console.log("")
console.log("Example patterns:")
console.log("  github.*issue  - tools with 'github' followed by 'issue'")
console.log("  ^read          - tools starting with 'read'")
console.log("  file|directory - tools mentioning 'file' or 'directory'")
console.log("  (create|list)  - tools with 'create' or 'list'")
console.log("")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt() {
  rl.question("regex> ", (pattern) => {
    if (pattern.toLowerCase() === "quit" || pattern.toLowerCase() === "exit") {
      console.log("Bye!")
      rl.close()
      return
    }

    if (pattern.toLowerCase() === "list") {
      console.log("\nAll tools:")
      for (const tool of sampleTools) {
        console.log(`  ${tool.id}: ${tool.description}`)
      }
      console.log("")
      prompt()
      return
    }

    if (!pattern.trim()) {
      prompt()
      return
    }

    try {
      const results = searchRegex(pattern)

      if (results.length === 0) {
        console.log("  No results found.\n")
      } else {
        console.log(`\nFound ${results.length} results:`)
        for (const result of results) {
          console.log(`  ${result.item.id} (${result.matched})`)
          console.log(`           ${result.item.description}`)
        }
        console.log("")
      }
    } catch (e) {
      console.log(`  Error: ${(e as Error).message}\n`)
    }

    prompt()
  })
}

prompt()
