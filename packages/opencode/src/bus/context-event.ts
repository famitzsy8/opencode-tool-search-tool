import z from "zod"
import { BusEvent } from "./bus-event"

/**
 * Context events for real-time observability of agent execution.
 * These events provide rich context about LLM requests, tool resolution,
 * and tool execution for external UIs and debugging tools.
 */
export namespace ContextEvent {
  /**
   * Emitted before an LLM call with the full context being sent.
   */
  export const LLMRequest = BusEvent.define(
    "context.llm.request",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      agent: z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
      model: z.object({
        providerID: z.string(),
        modelID: z.string(),
      }),
      system: z.array(z.string()),
      messages: z.array(
        z.object({
          role: z.enum(["system", "user", "assistant", "tool"]),
          content: z.unknown(),
        }),
      ),
      tools: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        }),
      ),
      tokenEstimate: z.object({
        system: z.number(),
        messages: z.number(),
        tools: z.number(),
        total: z.number(),
      }),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted after tools are resolved for a session.
   */
  export const ToolsResolved = BusEvent.define(
    "context.tools.resolved",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      agent: z.string(),
      tools: z.array(z.string()),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when a tool execution starts.
   */
  export const ToolExecutionStart = BusEvent.define(
    "context.tool.start",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      partID: z.string(),
      callID: z.string(),
      tool: z.string(),
      input: z.unknown(),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when a tool execution completes successfully.
   */
  export const ToolExecutionComplete = BusEvent.define(
    "context.tool.complete",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      partID: z.string(),
      callID: z.string(),
      tool: z.string(),
      input: z.unknown(),
      output: z.unknown(),
      durationMs: z.number(),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when a tool execution fails.
   */
  export const ToolExecutionError = BusEvent.define(
    "context.tool.error",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      partID: z.string(),
      callID: z.string(),
      tool: z.string(),
      input: z.unknown(),
      error: z.string(),
      durationMs: z.number(),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when an LLM response step completes.
   */
  export const StepComplete = BusEvent.define(
    "context.step.complete",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      finishReason: z.string().optional(),
      tokens: z.object({
        input: z.number(),
        output: z.number(),
        reasoning: z.number().optional(),
        cache: z
          .object({
            read: z.number().optional(),
            write: z.number().optional(),
          })
          .optional(),
      }),
      cost: z.number(),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when text is being streamed from the LLM.
   */
  export const TextDelta = BusEvent.define(
    "context.text.delta",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      partID: z.string(),
      delta: z.string(),
      timestamp: z.number(),
    }),
  )

  /**
   * Emitted when reasoning/thinking is being streamed.
   */
  export const ReasoningDelta = BusEvent.define(
    "context.reasoning.delta",
    z.object({
      sessionID: z.string(),
      messageID: z.string(),
      partID: z.string(),
      delta: z.string(),
      timestamp: z.number(),
    }),
  )
}
