import fs from 'fs';

export interface Todo {
    title: string;
    description: string;
    completed: boolean;
    priority: number;
    subTasks: SubTask[];
}

export interface SubTask {
    title: string;
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
        todos.push({ title, description, completed: false, priority: 10, subTasks: [] });
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

    public addSubTask(title: string, subTaskTitle: string) {
        const todos = this._loadTodos();
        const todoToAddSubTaskIndex = todos.findIndex(t => t.title === title);
        if (todoToAddSubTaskIndex === -1) {
            return false;
        }
        todos[todoToAddSubTaskIndex].subTasks.push({ title: subTaskTitle, completed: false });
        this._saveTodos(todos);
        return true;
    }

    public completeSubTask(title: string, subTaskTitle: string) {
        const todos = this._loadTodos();
        const todoToCompleteSubTaskIndex = todos.findIndex(t => t.title === title);
        if (todoToCompleteSubTaskIndex === -1) {
            return false;
        }
        const subTaskToCompleteIndex = todos[todoToCompleteSubTaskIndex].subTasks.findIndex(st => st.title === subTaskTitle);
        if (subTaskToCompleteIndex === -1) {
            return false;
        }
        todos[todoToCompleteSubTaskIndex].subTasks[subTaskToCompleteIndex].completed = true;
        this._saveTodos(todos);
        return true;
    }

    public setPriority(title: string, priority: number) {
        const todos = this._loadTodos();
        const todoToSetPriorityIndex = todos.findIndex(t => t.title === title);
        if (todoToSetPriorityIndex === -1) {
            return false;
        }
        todos[todoToSetPriorityIndex].priority = priority;
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