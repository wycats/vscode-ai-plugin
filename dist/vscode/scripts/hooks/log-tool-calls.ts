import { join } from "node:path";
import { createObserver, appendLog } from "../../lib/hook-runtime.ts";

const LOG_DIR = process.env.CLAUDE_PLUGIN_DATA
  ?? join(process.env.HOME ?? "", ".ai-plugin");

createObserver({
  name: "tool-call-logging",
  handle(event) {
    appendLog(LOG_DIR, "tool-call-log.jsonl", {
      event: event.event,
      tool: event.tool,
      rawTool: event.rawTool,
      input: event.input,
    });
  },
});
