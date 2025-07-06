import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TodoLocalDB } from "./TodoLocalDB";

export const server = new McpServer({
    name: "todo-server",
    version: "1.0.0",
    capabilities: {
        prompts: {},
        tools: {},
    },
});

server.tool(
    "add-todo",
    "Adds a todo to the user's todo list",
    {
        title: z.string().describe("The title of the todo"),
        description: z.string().describe("The description of the todo"),
    },
    async ({ title, description }) => {
        const db = new TodoLocalDB();
        db.addTodo(title, description);

        return {
            content: [{ type: "text", text: `Todo ${title} added` }],
        };
    }
)

server.tool(
    "complete-todo",
    "Completes the first todo in the todo list which matches the given title",
    {
        title: z.string().describe("The title of the todo"),
    },
    async ({ title }) => {
        const db = new TodoLocalDB();
        const success = db.completeTodo(title);

        if (success) {
            return {
                content: [{ type: "text", text: `Todo ${title} completed` }],
            };
        } else {
            return {
                content: [{ type: "text", text: `No Todo with title ${title} exists` }],
            };
        }
    }
)

server.tool(
    "get-todos",
    "Gets the user's todo list",
    {},
    async () => {
        const db = new TodoLocalDB();
        const todos = db.getTodos();

        return {
            content: [{type: "text", text: JSON.stringify(todos)}]
        }
    }
)

server.tool(
    "set-priority",
    "Sets the priority of a todo item, lower numbers are higher priority",
    {
        title: z.string().describe("The title of the todo"),
        priority: z.number().describe("The priority of the todo"),
    },
    async ({ title, priority }) => {
        const db = new TodoLocalDB();
        const success = db.setPriority(title, priority);

        if (success) {
            return {
                content: [{type: "text", text: `Priority for todo ${title} set to ${priority}`}]
            }
        } else {
            return {
                content: [{type: "text", text: `No Todo with title ${title} exists`}]
            }
        }
    }
)

server.tool(
    "add-sub-task",
    "Adds a sub task to a todo",
    {
        title: z.string().describe("The title of the todo"),
        subTaskTitle: z.string().describe("The title of the sub task"),
    },
    async ({ title, subTaskTitle }) => {
        const db = new TodoLocalDB();
        const success = db.addSubTask(title, subTaskTitle);

        if (success) {
            return {
                content: [{type: "text", text: `Sub task ${subTaskTitle} added to todo ${title}`}]
            }
        } else {
            return {
                content: [{type: "text", text: `No Todo with title ${title} exists`}]
            }
        }
    }
)

server.tool(
    "complete-sub-task",
    "Completes a sub task of a todo",
    {
        title: z.string().describe("The title of the todo"),
        subTaskTitle: z.string().describe("The title of the sub task"),
    },
    async ({ title, subTaskTitle }) => {
        const db = new TodoLocalDB();
        const success = db.completeSubTask(title, subTaskTitle);

        if (success) {
            return {
                content: [{type: "text", text: `Sub task ${subTaskTitle} completed for todo ${title}`}]
            }
        } else {
            return {
                content: [{type: "text", text: `No Todo with title ${title} exists or no sub task with title ${subTaskTitle} exists`}]
            }
        }
    }
)

server.registerPrompt(
    "Break Down Todo",
    {
        title: "Break Down Todo",
        description: "Breaks down a todo into sub tasks",
        argsSchema: {
            title: z.string().describe("The title of the todo to break down"),
        }
    },
    async ({ title }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please break down the following todo into sub tasks: ${title}`
            }
        }]
    })
)

server.prompt(
    "Re-prioritize Todos",
    () => ({
        messages: [{
            role: "user",
            content: {
              type: "text",
              text: `
                  Please re-prioritize my todos, you may set the priority by whatever criteria you think is best.
                  PROCESS:
                  1. get all my todos using the get-todos tool
                  2. once the tool returns the todos, read through the titles and descriptions of them
                  3. for each todo, determine a priority for it relative to the other todos
                  4. use the set-priority tool to set the priority of each todo
              `
            }
          }]
    })
)