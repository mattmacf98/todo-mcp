
import { OpenAI } from "openai";
const openai = new OpenAI();

export async function POST(request: Request) {
    const body = await request.json();
    const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: body.messages,
        tools: body.tools,
    });
    return new Response(JSON.stringify({ message: response.choices[0].message.content, tool_calls: response.choices[0].message.tool_calls }), {
      headers: { 'Content-Type': 'application/json' },
    });
}