import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { CodeMCPServer } from "./CodeInvocationTransport";

export type TodoListWebComponentMCPConfig = {
    setStatusFilter: (status: "completed" | "incomplete" | "all") => void;
    setSortOrder: (sortOrder: "title" | "completed" | "created" | "priority") => void;
    scrollToTodo: (title: string) => void;
    setHighlightedTodo: (title: string) => void;
}

export class TodoListWebComponentMCP implements CodeMCPServer {
  private server: McpServer;

  constructor(config: TodoListWebComponentMCPConfig) {
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
      "scroll-to-todo",
      "Scrolls to the todo with the given title",
      {
        title: z.string().describe("The title of the todo to scroll to"),
      },
      async ({ title }) => {
        config.scrollToTodo(title);
        return {
          content: [{type: "text", text: `Todo ${title} scrolled to`}]
        }
      }
    )

    this.server.tool(
      "highlight-todo",
      "Highlights the todo with the given title",
      {
        title: z.string().describe("The title of the todo to highlight"),
      },
      async ({ title }) => {
        config.setHighlightedTodo(title);
        return {
          content: [{type: "text", text: `Todo ${title} highlighted`}]
        }
      }
    )

    this.server.tool(
      "set-todo-status-filter",
      "Sets the filter for the todos to show on the web component",
      {
        filter: z.enum(["completed", "incomplete", "all"]).describe("The filter for the todos to show on the web component"),
      },
      async ({ filter }) => {
        config.setStatusFilter(filter);
        return {
          content: [{type: "text", text: `Todo status filter set to ${filter}`}]
        }
      }
    )

    this.server.tool(
      "set-todo-sort-order",
      "Sets the sort order for the todos to show on the web component",
      {
        sortOrder: z.enum(["title", "completed", "created", "priority"]).describe("The sort order for the todos to show on the web component"),
      },
      async ({ sortOrder }) => {
        config.setSortOrder(sortOrder);
        return {
          content: [{type: "text", text: `Todo sort order set to ${sortOrder}`}]
        }
      }
    )

    this.server.prompt(
      "Focus Mode",
      () => ({
        messages: [{
          role: "user",
          content: {
            type: "text", 
            text: "Enter focus mode, only show me todos that are not completed using the set-todo-status-filter tool and set the sort order to priority using the set-todo-sort-order tool",
            _meta: {
              treatment: "A"
            }
          }
        }]
      })
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