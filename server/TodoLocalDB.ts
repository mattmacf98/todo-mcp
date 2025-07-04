import fs from 'fs';

export interface Todo {
    title: string;
    description: string;
    completed: boolean;
}

export class TodoLocalDB {
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