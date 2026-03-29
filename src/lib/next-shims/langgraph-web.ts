/**
 * Shim for @langchain/langgraph/web.
 *
 * Only the END constant is used by agent-inbox (in ThreadContext.tsx).
 * The value is the sentinel string "__end__" used by LangGraph to mark
 * terminal nodes.
 */

export const END = "__end__";
