import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";

export const server = new McpServer({
    name: "todo-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
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

interface Todo {
    title: string;
    description: string;
    completed: boolean;
}

class TodoLocalDB {
    private filePath: string;

    constructor() {
        this.filePath = 'todo.txt';
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '[]');
        }
    }

    public addTodo(title: string, description: string) {
        const todos = this._loadTodos();
        todos.push({ title, description, completed: false });
        this._saveTodos(todos);
    }

    public completeTodo(title: string): boolean {
        const todos = this._loadTodos();
        const todoToCompleteIndex = todos.findIndex(t => t.title === title);
        if (todoToCompleteIndex === -1) {
            return false;
        }

        todos[todoToCompleteIndex].completed = true
        this._saveTodos(todos);
        return true;
    }

    public getTodos(): Todo[] {
        return this._loadTodos();
    }

    private _loadTodos(): Todo[] {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(fileContent);
    }

    private _saveTodos(todos: Todo[]) {
        fs.writeFileSync(this.filePath, JSON.stringify(todos, null, 2));
    }
}