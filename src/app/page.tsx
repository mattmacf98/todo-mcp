"use client";

import { useEffect, useRef, useState } from "react";
import { MCPClient } from "@/mcp/MCPClient";
import { TodoListWebComponentMCP } from "@/mcp/TodoLIstWebComponentMCP";

export default function Home() {
  const mcpClientRef = useRef<MCPClient | null>(null);
  const [chatDisplayMessages, setChatDisplayMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    mcpClientRef.current = new MCPClient();
    mcpClientRef.current.connectRemoteServer("todo-server", "http://localhost:5000/mcp");
  }, []);

  const callAI = async (userMessage: string) => {
    const response = await mcpClientRef.current!.queryLLMWithTools(userMessage);
    console.log("RESPONSE", response);
    const processedResponse = await mcpClientRef.current!.processLLMResponse(response);
    return processedResponse;
  }

  const callPrompt = async (promptName: string, args?: Record<string, any>) => {
    const response = await mcpClientRef.current!.callPrompt(promptName, args);
    const processedResponse = await mcpClientRef.current!.processLLMResponse(response);
    return processedResponse.message;
  }

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!mcpClientRef.current) return;
    const response = await callAI(input);
    console.log("RESPONSE SEND MESSAGE", response);
    setChatDisplayMessages([...chatDisplayMessages, { role: "user", content: input }, { role: "assistant", content: response.message, runId: response.runId }]);
    setInput("");
  };

  const handlePromptClick = async (promptName: string, args?: Record<string, any>) => {
    console.log("PROMPT CLICKED", promptName, args);
    const response = await callPrompt(promptName, args);
    console.log("RESPONSE", response);
    setChatDisplayMessages([...chatDisplayMessages, { role: "user", content: `User clicked prompt ${promptName}` }, { role: "assistant", content: response }]);
    setInput("");
  }

  const handleTodoClick = async (title: string, description: string) => {
    const message = `I clicked on todo ${title} with description ${description} give me some context on what I should do to achieve this todo`;
    const response = await callAI(message);
    console.log("RESPONSE", response);
    setChatDisplayMessages([...chatDisplayMessages, { role: "user", content: `User clicked todo ${title}` }, { role: "assistant", content: response }]);
    setInput("");
  }

  return (
    <div className="flex h-screen">
      {/* Left panel - Todo List */}
      <div className="w-2/3 border-r bg-gray-50 p-6">
          <TodoListWebComponent mcpClient={mcpClientRef.current} handleTodoClick={handleTodoClick} handlePromptClick={handlePromptClick} />
      </div>

      {/* Right panel - Chat */}
      <div className="w-1/3 flex flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          {chatDisplayMessages.map((message, index) => (
            <ChatMessage key={index} message={message} isUser={message.role === "user"} />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t p-4 bg-white">
          {/* Prompt buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {mcpClientRef.current?.getPromptsWithNoArgs().map((prompt) => (
              <button
                key={prompt.name}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                onClick={() => handlePromptClick(prompt.name)}
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

const ChatMessage = ({message, isUser}: {message: any, isUser: boolean}) => {
  const [likedStatus, setLikedStatus] = useState<"like" | "dislike" | null>(null);

  const handleLike = async () => {
    console.log("LIKE", message.runId);
    fetch("/api/rate", {
      method: "POST",
      body: JSON.stringify({
        runId: message.runId,
        score: 1.0,
      }),
    });
    setLikedStatus("like");
  }

  const handleDislike = async () => {
    console.log("DISLIKE", message.runId);
    fetch("/api/rate", {
      method: "POST",
      body: JSON.stringify({
        runId: message.runId,
        score: 0.0,
      }),
    });
    setLikedStatus("dislike");
  }

  return (
    <div 
      className={`mb-4 p-4 rounded-lg ${
        isUser
          ? "bg-gray-50 mr-4" 
          : "bg-blue-50 ml-4"
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 mb-1">
          {message.role === "assistant" ? "AI Assistant" : "You"}
        </div>
        {message.role === "assistant" && (
          <div className="flex gap-2">
            <button className={`hover:text-green-600 ${likedStatus === "like" ? "text-green-600" : "text-black"}`} onClick={handleLike}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </button>
            <button className={`hover:text-red-600 ${likedStatus === "dislike" ? "text-red-600" : "text-black"}`} onClick={handleDislike}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="text-gray-800">{message.content}</div>
    </div>
  )
}

const TodoListWebComponent = ({mcpClient, handleTodoClick, handlePromptClick}: {mcpClient: MCPClient | null, handleTodoClick: (title: string, description: string) => void, handlePromptClick: (promptName: string, args?: Record<string, any>) => void}) => {
  const [todos, setTodos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<"completed" | "incomplete" | "all">("all");
  const [sortOrder, setSortOrder] = useState<"title" | "completed" | "created" | "priority">("created");
  const [highlightedTodo, setHighlightedTodo] = useState<string | null>(null);

  const scrollToTodo = (title: string) => {
    const todoElement = document.getElementById(title);
    if (todoElement) {
      todoElement.scrollIntoView({ behavior: "smooth" });
    }
  }

  const handleTodoItemPrompClick = async (promptName: string, title: string) => {
    await handlePromptClick(promptName, {title: title});
  }

  useEffect(() => {
    if (!mcpClient) return;
    async function initServer() {
      const server = new TodoListWebComponentMCP({
        setStatusFilter,
        setSortOrder,
        scrollToTodo,
        setHighlightedTodo
      });
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
          <div className={`bg-white rounded-lg shadow-lg p-6 border ${highlightedTodo === todo.title ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} hover:shadow-xl transition-shadow mb-4`}
           key={todo.title} onClick={() => handleTodoClick(todo.title, todo.description)} id={todo.title}>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{todo.title}</h2>
            <p className="text-gray-600 mb-4 whitespace-pre-wrap">{todo.description}</p>  
            <div className="flex items-center gap-2 mb-4">
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
            {todo.subTasks && todo.subTasks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Subtasks:</h3>
                <ul className="space-y-1">
                  {todo.subTasks.map((subtask: any) => (
                    <li 
                      key={subtask.title}
                      className={`text-sm ${
                        subtask.completed 
                          ? "text-gray-400 line-through" 
                          : "text-gray-600"
                      }`}
                    >
                      {subtask.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              {mcpClient?.getPromptsWithTitleArg().map((prompt) => (
                <button
                  key={prompt.name}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTodoItemPrompClick(prompt.name, todo.title);
                  }}
                >
                  {prompt.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
