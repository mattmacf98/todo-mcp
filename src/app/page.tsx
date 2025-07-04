"use client";

import { useEffect, useRef, useState } from "react";
import { MCPClient } from "@/mcp/MCPClient";

export default function Home() {
  const mcpClientRef = useRef<MCPClient | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    mcpClientRef.current = new MCPClient();
    mcpClientRef.current.connectRemoteServer("todo-server", "http://localhost:5000/mcp");
  }, []);

  const callAI = async (userMessage: string) => {
    const response = await mcpClientRef.current!.queryLLMWithTools(userMessage);
    const processedResponse = await mcpClientRef.current!.processLLMResponse(response);
    return processedResponse.message;
  }

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!mcpClientRef.current) return;
    const response = await callAI(input);
    console.log("RESPONSE", response);
    setMessages([...messages, { role: "user", content: input }, { role: "assistant", content: response }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            <div className="font-bold">{message.role}</div>
            <div>{message.content}</div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <form className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded border p-2"
          />
          <button 
            onClick={(e: any) => handleSendMessage(e)}
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
