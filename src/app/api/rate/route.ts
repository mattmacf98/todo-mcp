import { Client } from "langsmith";

const client = new Client();

export async function POST(request: Request) {
  const body = await request.json();
  const runId = body.runId;
  const score = body.score;

  const feedback = await client.createFeedback(runId, "user-score", {
    score: score
  });

  console.log("FEEDBACK", feedback);

  return new Response(JSON.stringify({ feedbackId: feedback.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
}