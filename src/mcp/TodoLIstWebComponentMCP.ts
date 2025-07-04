import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { CodeMCPServer } from "./CodeInvocationTransport";

export class TodoListWebComponentMCP implements CodeMCPServer {
  private server: McpServer;

  constructor(setStatusFilter: (status: "completed" | "incomplete" | "all") => void, setSortOrder: (sortOrder: "title" | "completed" | "created") => void) {
    this.server = new McpServer({
      name: "TodoListWebComponent",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    this.server.tool(
      "set-todo-status-filter",
      "Sets the filter for the todos to show on the web component",
      {
        filter: z.enum(["completed", "incomplete", "all"]).describe("The filter for the todos to show on the web component"),
      },
      async ({ filter }) => {
        setStatusFilter(filter);
        return {
          content: [{type: "text", text: `Todo status filter set to ${filter}`}]
        }
      }
    )

    this.server.tool(
      "set-todo-sort-order",
      "Sets the sort order for the todos to show on the web component",
      {
        sortOrder: z.enum(["title", "completed", "created"]).describe("The sort order for the todos to show on the web component"),
      },
      async ({ sortOrder }) => {
        setSortOrder(sortOrder);
        return {
          content: [{type: "text", text: `Todo sort order set to ${sortOrder}`}]
        }
      }
    )
  }

  public getServer(): McpServer {
    return this.server;
  }

  public connect(transport: Transport): void {
    this.server.connect(transport);
  }

  public getName(): string {
    return "TodoListWebComponent";
  }
}