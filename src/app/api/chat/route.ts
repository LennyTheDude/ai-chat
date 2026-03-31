import { AIModel, getModel } from "@/lib/ai";

type ChatApiMessage = {
  role?: "user" | "assistant" | "system";
  content?: string;
};

type ChatApiRequest = {
  model?: AIModel;
  messages?: ChatApiMessage[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatApiRequest;
  const model = body.model;
  const messages = body.messages;

  if (!model || !messages || !Array.isArray(messages)) {
    return Response.json(
      { error: "Invalid request body. Expected model and messages." },
      { status: 400 },
    );
  }

  if (!Object.values(AIModel).includes(model)) {
    return Response.json({ error: "Unsupported model." }, { status: 400 });
  }

  const selectedModel = getModel(model);
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  const replyText = `[mock:${selectedModel.provider}/${selectedModel.model}] ${
    lastUserMessage ? `You said: "${lastUserMessage}"` : "No user message provided."
  }`;
  const chunks = replyText.split(" ");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`${chunk} `));
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
