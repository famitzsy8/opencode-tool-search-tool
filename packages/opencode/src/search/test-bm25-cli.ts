#!/usr/bin/env bun
/**
 * CLI tool to test BM25 search implementation
 * Usage: bun run src/search/test-bm25-cli.ts
 */

import { BM25 } from "./bm25"
import * as readline from "readline"

// Sample tool inventory
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

// Build BM25 index
const index = BM25.createIndex(sampleTools, (tool) => [tool.name, tool.description])

console.log("=== BM25 Search Test CLI ===")
console.log(`Indexed ${sampleTools.length} tools`)
console.log(`Config: k1=${index.config.k1}, b=${index.config.b}`)
console.log("")
console.log("Type a search query and press Enter. Type 'quit' to exit.")
console.log("Type 'list' to see all tools.")
console.log("Type 'stats' to see index statistics.")
console.log("")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt() {
  rl.question("search> ", (query) => {
    if (query.toLowerCase() === "quit" || query.toLowerCase() === "exit") {
      console.log("Bye!")
      rl.close()
      return
    }

    if (query.toLowerCase() === "list") {
      console.log("\nAll tools:")
      for (const tool of sampleTools) {
        console.log(`  ${tool.id}: ${tool.description}`)
      }
      console.log("")
      prompt()
      return
    }

    if (query.toLowerCase() === "stats") {
      const stats = BM25.getStats(index)
      console.log("\nIndex statistics:")
      console.log(`  Documents: ${stats.documentCount}`)
      console.log(`  Unique terms: ${stats.uniqueTerms}`)
      console.log(`  Avg doc length: ${stats.averageDocumentLength.toFixed(2)}`)
      console.log(`  k1: ${stats.config.k1}, b: ${stats.config.b}`)
      console.log("")
      prompt()
      return
    }

    if (!query.trim()) {
      prompt()
      return
    }

    const results = BM25.search(index, query, 10)

    if (results.length === 0) {
      console.log("  No results found.\n")
    } else {
      console.log(`\nFound ${results.length} results:`)
      for (const result of results) {
        console.log(`  [${result.score.toFixed(3)}] ${result.item.id}`)
        console.log(`           ${result.item.description}`)
      }
      console.log("")
    }

    prompt()
  })
}

prompt()
