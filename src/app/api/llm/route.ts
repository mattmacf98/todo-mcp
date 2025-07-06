
import { OpenAI } from "openai";
import { wrapOpenAI } from "langsmith/wrappers";
import { pull } from "langchain/hub";
import { convertPromptToOpenAI } from "@langchain/openai";
import { traceable } from "langsmith/traceable";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import { v4 as uuidv4 } from 'uuid';

const langsmithProject = "todo-mcp";

const wrapedOpenAI = wrapOpenAI(new OpenAI(), {
  project_name: langsmithProject
});

const pullPrompt = async (promptName: string) => {
  const pulledPrompt = await pull(promptName);
  const systemPrompt = await pulledPrompt.invoke({});
  return convertPromptToOpenAI(systemPrompt).messages[0];
}

const getSystemPrompt = async (threadId: string) => {
  let treatment = threadIdToTreatment[threadId];
  if (!treatment) {
    const randomPrompt = Object.keys(promptOptions)[Math.floor(Math.random() * Object.keys(promptOptions).length)];
    threadIdToTreatment[threadId] = randomPrompt;
    treatment = randomPrompt;
  }
  
  return promptOptions[treatment];
}

const promptOptions: Record<string, any> = {
  "A": await pullPrompt("todo-mcp-sys-a"),
  "B": await pullPrompt("todo-mcp-sys-b")
}

const threadIdToTreatment: Record<string, string> = {};

export async function POST(request: Request) {
  const body = await request.json();
  const runId = uuidv4();
  const tracedChatPipeline = traceable(chatPipeline, {
    project_name: langsmithProject,
    id: runId
  });
  const response = await tracedChatPipeline(body.messages, body.tools, body.threadId, body.langchainMetadata);
  console.log("RESPONSE", response);
  return new Response(JSON.stringify({ message: response.message.content, tool_calls: response.message.tool_calls, threadId: response.threadId, runId: runId }), {
    headers: { 'Content-Type': 'application/json' },
  });
}


const chatPipeline = async (messages: any[], tools: any[], threadId: string, langchainMetadata?: Record<string, any>) => {

    // Invoke the model
    const chatCompletion = await wrapedOpenAI.chat.completions.create(
      {
        model: "gpt-4.1-nano",
        messages: [await getSystemPrompt(threadId), ...messages],
        tools: tools
      },
      {
        langsmithExtra: {
          metadata: { 
            session_id: threadId,
            system_prompt_treatment: threadIdToTreatment[threadId],
            ...langchainMetadata
          },
        },
      }
    );
    return {
      message: chatCompletion.choices[0].message,
      tool_calls: chatCompletion.choices[0].message.tool_calls,
      threadId: threadId
    };
}