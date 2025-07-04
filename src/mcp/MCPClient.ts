import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { OpenAIHost } from "./OpenAIHost";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CodeInvocationClientTransport, CodeInvocationServerTransport, CodeMCPServer } from "./CodeInvocationTransport";

export interface OpenAIMCPTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object',
            properties: {
                [key: string]: {
                    type: string;
                    description: string;
                }
            },
            required: string[];
        }
    }
}

export const createOpenAIMCPTool = (name: string, description: string, inputSchema: any): OpenAIMCPTool => {
    return {
        type: 'function',
        function: {
            name,
            description,
            parameters: inputSchema
        }
    };
  }

interface ServerConnection {
  client: Client;
  tools: OpenAIMCPTool[];
}

export class MCPClient {
    private servers: Record<string, ServerConnection> = {};
    private llm: OpenAIHost;
    private messages: any[];
    private tools: OpenAIMCPTool[];
  
    constructor() {
      this.llm = new OpenAIHost();
      this.messages = [];
      this.tools = [];
    }

    public async connectRemoteServer(name: string, url: string) {
        console.log("Adding remote server", name, url);
        const baseUrl = new URL(url);
        const client = new Client({name: "mcp-client-cli", version: "1.0.0"})
  
        try {
          const transport = new StreamableHTTPClientTransport(baseUrl);
          await client.connect(transport);
          console.log("Connected to remote server streamable", name);
        } catch (error: any) {
          const sseTransport = new SSEClientTransport(baseUrl);
          await client.connect(sseTransport);
          console.log("Connected to remote server sse", name);
        }
  
        let tools: OpenAIMCPTool[] = [];
        try {
          const toolsRes = await client.listTools();
          console.log("Available tools", toolsRes.tools);
          tools = toolsRes.tools.map((tool) => {
              return createOpenAIMCPTool(tool.name, tool.description || `Tool: ${tool.name}`, tool.inputSchema);
          });
          this.tools.push(...tools)
        } catch(error: any) {
          console.error(`Error listing tools for server ${name}:`, error)
        }

        this.servers[name] = {client, tools};
    }

    public async addCodeCallServer(server: CodeMCPServer) {
      const serverTransport = new CodeInvocationServerTransport();
      const clientTransport = new CodeInvocationClientTransport();
      serverTransport.setClientTransport(clientTransport);
      clientTransport.setServerTransport(serverTransport);

      const client = new Client({name: "mcp-client-cli", version: "1.0.0"})
 
      server.connect(serverTransport);
      await client.connect(clientTransport);
      
      let tools: OpenAIMCPTool[] = [];
      try {
        const toolsRes = await client.listTools();
        console.log("Available tools", toolsRes.tools);
        tools = toolsRes.tools.map((tool) => {
            return createOpenAIMCPTool(tool.name, tool.description || `Tool: ${tool.name}`, tool.inputSchema);
        });
        this.tools.push(...tools);
      } catch(error: any) {
        console.error(`Error listing tools for server ${server.getName()}:`, error)
      }

      this.servers[server.getName()] = {client, tools};
  }

    public async queryLLMWithTools(userQuery: string) {
        this.messages.push({role: "user", content: userQuery})
        const response = await this.llm.sendMessage(this.messages, this.tools);
        return response;
    }
  
    public async processLLMResponse(llmResponse: any): Promise<any> {
      console.log("Processing LLM response", llmResponse);
      if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
        for (const toolCall of llmResponse.tool_calls) {
            const {name, arguments: args} = toolCall.function;
            const id = toolCall.id;
  
            try {
                const toolServerConnection = Object.values(this.servers).find((server) => server.tools.some((tool) => (tool.function as any).name === name));
                if (!toolServerConnection) {
                  throw new Error(`Tool ${name} not found in any server`);
                }
                const toolResult = await toolServerConnection.client.callTool({name: name, arguments: JSON.parse(args)});
  
                this.messages.push({
                    role: 'assistant',
                    content: "",
                    tool_calls: [{id, function: {name, arguments: JSON.stringify(args)}, type: "function"}]
                });
  
                this.messages.push({
                    role: "tool",
                    tool_call_id: id,
                    content: toolResult.isError ? `Error: ${(toolResult.content as any[])[0].text}` : (toolResult.content as any[])[0].text
                })
            } catch(error: any) {
                console.error(`Error calling tool ${name}:`, error)
  
                this.messages.push({
                    role: "tool",
                    content: `Error executing tool ${name}: ${error.message}`
                })
            }
  
        }

        // Recursively process the LLM response if there are more tool calls
        const newLLMResponse = await this.llm.sendMessage(this.messages, this.tools);
        return this.processLLMResponse(newLLMResponse);
      }

      this.messages.push({role: "assistant", content: llmResponse.message});
      return llmResponse;
    }
  }