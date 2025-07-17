import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { OpenAIHost, OpenAIMCPTool, createOpenAIMCPTool } from "./OpenAIHost";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CodeInvocationClientTransport, CodeInvocationServerTransport, CodeMCPServer } from "./CodeInvocationTransport";

interface ServerConnection {
  client: Client;
  tools: OpenAIMCPTool[];
  prompts: MCPPrompt[];
}

export interface MCPPrompt {
  name: string;
  arguments?: Record<string, any>;
}

export class MCPClient {
    private servers: Record<string, ServerConnection> = {};
    private llm: OpenAIHost;
    private messages: any[];
    private tools: OpenAIMCPTool[];
    private prompts: MCPPrompt[];
    private threadId?: string;
  
    constructor() {
      this.llm = new OpenAIHost();
      this.messages = [];
      this.tools = [];
      this.prompts = [];
      this.threadId = undefined;
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

        let prompts: MCPPrompt[] = [];
        try {
          const promptsRes = await client.listPrompts();
          console.log("Available prompts", promptsRes.prompts);
          prompts = promptsRes.prompts.map((prompt) => {
            return {name: prompt.name, arguments: prompt.arguments as Record<string, any>};
          });
          this.prompts.push(...prompts);
        } catch(error: any) {
          console.warn(`Error listing prompts for server ${name}:`, error)
        }

        this.servers[name] = {client, tools, prompts};
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
        console.warn(`Error listing tools for server ${server.getName()}:`, error)
      }

      let prompts: MCPPrompt[] = [];
      try {
        const promptsRes = await client.listPrompts();
        console.log("Available prompts", promptsRes.prompts);
        prompts = promptsRes.prompts.map((prompt) => {
          return {name: prompt.name, arguments: prompt.arguments as Record<string, any>};
        });
        this.prompts.push(...prompts);
      } catch(error: any) {
        console.warn(`Error listing prompts for server ${server.getName()}:`, error)
      }

      this.servers[server.getName()] = {client, tools, prompts};
    }

    private cleanPromptName(promptName: string) {
      return promptName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    }

    public async callPrompt(promptName: string, args?: Record<string, any>) {
      console.log("Calling prompt", promptName, args);
      const promptServerConnection = Object.values(this.servers).find((server) => server.prompts.some((prompt) => prompt.name === promptName));
      if (!promptServerConnection) {
          throw new Error(`Prompt ${promptName} not found in any server`);
      }
      const promptResponse = await promptServerConnection.client.getPrompt({name: promptName, arguments: args});
      const promptMessage = promptResponse.messages[0].content.text as string;
      console.log("Prompt response", promptResponse);
      let langchainMetadata: Record<string, any> = {};
      if (promptResponse.messages[0].content._meta?.treatment) {
        langchainMetadata = {
          [`${this.cleanPromptName(promptName)}_treatment`]: promptResponse.messages[0].content._meta.treatment
        };
      }

      console.log("Langchain metadata", langchainMetadata);

      return await this.queryLLMWithTools(promptMessage, langchainMetadata);
    }

    public getPrompts() {
      return this.prompts;
    }

    public getPromptsWithTitleArg() {
      return this.prompts.filter((prompt) => prompt.arguments !== undefined && prompt.arguments?.findIndex((arg: any) => arg.name === "title") !== -1);
    }

    public getPromptsWithNoArgs() {
      return this.prompts.filter((prompt) => prompt.arguments === undefined);
    }

    public async queryLLMWithTools(userQuery: string, langchainMetadata?: Record<string, any>) {
        this.messages.push({role: "user", content: userQuery})
        const response = await this.llm.sendMessage(this.messages, this.tools, this.threadId, langchainMetadata);
        this.threadId = response.threadId;
        console.log("LLM response", response);
        return response;
    }
  
    public async processLLMResponse(llmResponse: any, recursiveCount: number = 0): Promise<any> {
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
        if (recursiveCount > 10) {
          this.messages.push({
            role: "tool",
            content: `Exceeded max recursive calls`
          })
        }
        
        const newLLMResponse = await this.llm.sendMessage(this.messages, this.tools, this.threadId);
        this.threadId = newLLMResponse.threadId;
        return this.processLLMResponse(newLLMResponse, recursiveCount + 1);
      }
      this.messages.push({role: "assistant", content: llmResponse.message});
      return llmResponse;
    }
  }