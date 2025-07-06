export class OpenAIHost {
    public async sendMessage(messages: any[], tools: any[], threadId?: string, langchainMetadata?: Record<string, any>): Promise<any> {
        const response = await fetch("/api/llm", {
            method: "POST",
            body: JSON.stringify({messages, tools, threadId, langchainMetadata}),
        });
        const data = await response.json();
        console.log("DATA", data);
        return data;
    }
}

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