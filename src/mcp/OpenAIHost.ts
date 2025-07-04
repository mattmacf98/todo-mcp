export class OpenAIHost {
    public async sendMessage(messages: any[], tools: any[]): Promise<any> {
        const response = await fetch("/api/llm", {
            method: "POST",
            body: JSON.stringify({messages, tools}),
        });
        const data = await response.json();
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