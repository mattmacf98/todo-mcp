"use client";

import { useEffect, useRef, useState } from "react";
import { MCPClient, MCPPrompt } from "@/mcp/MCPClient";
import { TodoListWebComponentMCP } from "@/mcp/TodoLIstWebComponentMCP";

export default function Home() {
  const mcpClientRef = useRef<MCPClient | null>(null);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [chatDisplayMessages, setChatDisplayMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    mcpClientRef.current = new MCPClient();
    mcpClientRef.current.connectRemoteServer("todo-server", "http://localhost:5000/mcp");
  }, []);

  useEffect(() => {
    if (!mcpClientRef.current) return;
    setPrompts(mcpClientRef.current.getPrompts());
  }, [mcpClientRef.current]);

  const callAI = async (userMessage: string) => {
    const response = await mcpClientRef.current!.queryLLMWithTools(userMessage);
    const processedResponse = await mcpClientRef.current!.processLLMResponse(response);
    return processedResponse.message;
  }

  const callPrompt = async (promptName: string, args: Record<string, any>) => {
    const response = await mcpClientRef.current!.callPrompt(promptName, args);
    const processedResponse = await mcpClientRef.current!.processLLMResponse(response);
    return processedResponse.message;
  }

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!mcpClientRef.current) return;
    const response = await callAI(input);
    console.log("RESPONSE", response);
    setChatDisplayMessages([...chatDisplayMessages, { role: "user", content: input }, { role: "assistant", content: response }]);
    setInput("");
  };

  const handlePromptClick = async (promptName: string, args: Record<string, any>) => {
    const response = await callPrompt(promptName, args);
    console.log("RESPONSE", response);
    setChatDisplayMessages([...chatDisplayMessages, { role: "user", content: `User clicked prompt ${promptName}` }, { role: "assistant", content: response }]);
    setInput("");
  }

  return (
    <div className="flex h-screen">
      {/* Left panel - Todo List */}
      <div className="w-2/3 border-r bg-gray-50 p-6">
          <TodoListWebComponent mcpClient={mcpClientRef.current} />
      </div>

      {/* Right panel - Chat */}
      <div className="w-1/3 flex flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          {chatDisplayMessages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-4 p-4 rounded-lg ${
                message.role === "assistant" 
                  ? "bg-gray-50 mr-4" 
                  : "bg-blue-50 ml-4"
              }`}
            >
              <div className="text-sm text-gray-500 mb-1">
                {message.role === "assistant" ? "AI Assistant" : "You"}
              </div>
              <div className="text-gray-800">{message.content}</div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t p-4 bg-white">
          {/* Prompt buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {prompts.map((prompt) => (
              <button
                key={prompt.name}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                onClick={() => handlePromptClick(prompt.name, prompt.arguments)}
              >
                {prompt.name}
              </button>
            ))}
          </div>

          <form className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-gray-300 p-3 focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={(e: any) => handleSendMessage(e)}
              type="submit"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const TodoListWebComponent = ({mcpClient}: {mcpClient: MCPClient | null}) => {
  const [todos, setTodos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<"completed" | "incomplete" | "all">("all");
  const [sortOrder, setSortOrder] = useState<"title" | "completed" | "created" | "priority">("created");

  useEffect(() => {
    if (!mcpClient) return;
    async function initServer() {
      const server = new TodoListWebComponentMCP(setStatusFilter, setSortOrder);
      if (mcpClient) {
        await mcpClient.addCodeCallServer(server);
      }
    }
    initServer();

    async function refreshTodos() {
      const todos = await fetch('http://localhost:5000/todos').then(res => res.json());
      setTodos(todos);
    }
    refreshTodos();
    const interval = setInterval(refreshTodos, 5000);
    return () => clearInterval(interval);
  }, [mcpClient]);

  const filteredTodos = todos.filter((todo) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return todo.completed;
    if (statusFilter === "incomplete") return !todo.completed;
    return false;
  });

  const sortedTodos = filteredTodos.sort((a, b) => {
    if (sortOrder === "title") return a.title.localeCompare(b.title);
    if (sortOrder === "completed") return a.completed ? 1 : -1;
    if (sortOrder === "priority") return a.priority - b.priority;
    return 0;
  });


  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Todo List</h1>
      <div className="max-h-[700px] overflow-y-auto">
        { sortedTodos.map((todo: any) => (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow mb-4" key={todo.title}>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{todo.title}</h2>
            <p className="text-gray-600 mb-4 whitespace-pre-wrap">{todo.description}</p>  
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                todo.completed 
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {todo.completed ? "Completed" : "In Progress"}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Priority: {todo.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
