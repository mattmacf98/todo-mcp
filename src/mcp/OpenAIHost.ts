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