import { AIModel, getModel } from "@/lib/ai";
import { customGPTs } from "@/lib/custom-gpts";
import { simpleJsQuizQuestions, type QuizQuestion } from "@/lib/quizSimple";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateText, streamText } from "ai";

const DAILY_TOKEN_LIMIT = 10000;

type ChatApiMessage = {
  role?: "user" | "assistant" | "system";
  content?: string;
};

type ChatApiRequest = {
  chatId?: string;
  model?: AIModel;
  messages?: ChatApiMessage[];
};

type QuizSimpleState = {
  currentQuestion: number;
  score: number;
  questions: QuizQuestion[];
};

type QuizDeepState = {
  question: string;
};

const QUIZ_OPTION_LABELS = ["A", "B", "C", "D"];

function parseQuizAnswer(content: string): number | null {
  const normalized = content.trim().toUpperCase();
  if (!normalized) return null;
  const firstLetter = normalized[0] ?? "";
  const byLetter = QUIZ_OPTION_LABELS.indexOf(firstLetter);
  return byLetter !== -1 ? byLetter : null;
}

function formatQuizQuestion(question: QuizQuestion, questionNumber: number, total: number): string {
  const options = question.options
    .map((option, index) => `${QUIZ_OPTION_LABELS[index]}) ${option}`)
    .join("\n");
  return `Question ${questionNumber}/${total}:\n${question.question}\n${options}`;
}

function formatFeedback(isCorrect: boolean, question: QuizQuestion): string {
  return `Feedback:\n${isCorrect ? "Correct." : "Incorrect."} ${question.explanation}`;
}

function isQuizSimpleState(value: unknown): value is QuizSimpleState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QuizSimpleState>;
  return (
    typeof candidate.currentQuestion === "number" &&
    typeof candidate.score === "number" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.length > 0
  );
}

function createInitialQuizSimpleState(): QuizSimpleState {
  return {
    currentQuestion: 0,
    score: 0,
    questions: simpleJsQuizQuestions,
  };
}

function isQuizDeepState(value: unknown): value is QuizDeepState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QuizDeepState>;
  return typeof candidate.question === "string" && candidate.question.trim().length > 0;
}

function getDeepQuizQuestion(): string {
  return [
    "In JavaScript, explain how closures can accidentally cause stale state bugs in asynchronous callbacks.",
    "Provide a concrete example and then show one robust way to avoid the bug.",
  ].join(" ");
}

async function saveAssistantMessage(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, chatId: string, content: string) {
  if (!content.trim()) return;
  await supabase.from("messages").insert({
    chat_id: chatId,
    role: "assistant",
    content,
  });
}

export async function POST(request: Request) {
  const prepStarted = performance.now();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ChatApiRequest;
  const chatId = body.chatId;
  const model = body.model;
  const messages = body.messages;

  if (!chatId || !model || !messages || !Array.isArray(messages)) {
    return Response.json(
      { error: "Invalid request body. Expected chatId, model and messages." },
      { status: 400 },
    );
  }

  if (!Object.values(AIModel).includes(model)) {
    return Response.json({ error: "Unsupported model." }, { status: 400 });
  }

  const provider = model === AIModel.CLAUDE ? "anthropic" : "openai";
  const providerLabel = provider === "anthropic" ? "Claude" : "OpenAI";
  const today = new Date().toISOString().slice(0, 10);

  const { data: chatData, error: chatError } = await supabase
    .from("chats")
    .select("id, gpt_id, metadata")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError || !chatData) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const last = messages[messages.length - 1];
  if (last?.role !== "user") {
    return Response.json(
      { error: "Last message must be a user message when starting a turn." },
      { status: 400 },
    );
  }

  const userContent = last.content?.trim() ?? "";
  if (!userContent) {
    return Response.json({ error: "User message content is required." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("messages").insert({
    chat_id: chatId,
    role: "user",
    content: userContent,
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const selectedGpt = chatData.gpt_id ? customGPTs.find((gpt) => gpt.id === chatData.gpt_id) ?? null : null;

  if (selectedGpt?.type === "quiz_simple") {
    const existingState = isQuizSimpleState(chatData.metadata) ? chatData.metadata : null;
    const state: QuizSimpleState = existingState ?? createInitialQuizSimpleState();

    // Missing or malformed metadata reinitializes the quiz state.
    if (!existingState) {
      const { error: metadataError } = await supabase
        .from("chats")
        .update({ metadata: state, model })
        .eq("id", chatId)
        .eq("user_id", user.id);
      if (metadataError) {
        return Response.json({ error: metadataError.message }, { status: 500 });
      }

      const firstQuestion = formatQuizQuestion(state.questions[0], 1, state.questions.length);
      const initialReply = `${firstQuestion}\n\nFeedback:\nAnswer with A, B, C, or D.`;
      await saveAssistantMessage(supabase, chatId, initialReply);
      return new Response(initialReply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const current = state.questions[state.currentQuestion];
    if (!current) {
      const finalReply = `Quiz complete.\nFinal score: ${state.score}/${state.questions.length}`;
      await saveAssistantMessage(supabase, chatId, finalReply);
      return new Response(finalReply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const answerIndex = parseQuizAnswer(userContent);
    if (answerIndex === null) {
      const invalidAnswerReply = [
        "Feedback:",
        "Invalid answer format. Use A, B, C, or D.",
        "",
        formatQuizQuestion(current, state.currentQuestion + 1, state.questions.length),
      ].join("\n");
      await saveAssistantMessage(supabase, chatId, invalidAnswerReply);
      return new Response(invalidAnswerReply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const isCorrect = answerIndex === current.correctIndex;
    const nextState: QuizSimpleState = {
      ...state,
      score: isCorrect ? state.score + 1 : state.score,
      currentQuestion: state.currentQuestion + 1,
    };

    const { error: metadataError } = await supabase
      .from("chats")
      .update({ metadata: nextState, model })
      .eq("id", chatId)
      .eq("user_id", user.id);
    if (metadataError) {
      return Response.json({ error: metadataError.message }, { status: 500 });
    }

    const feedbackBlock = formatFeedback(isCorrect, current);
    const nextQuestion = nextState.questions[nextState.currentQuestion];

    const reply = nextQuestion
      ? `${feedbackBlock}\n\n${formatQuizQuestion(nextQuestion, nextState.currentQuestion + 1, nextState.questions.length)}`
      : `${feedbackBlock}\n\nQuiz complete.\nFinal score: ${nextState.score}/${nextState.questions.length}`;

    await saveAssistantMessage(supabase, chatId, reply);
    return new Response(reply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  if (selectedGpt?.type === "quiz_deep") {
    const existingState = isQuizDeepState(chatData.metadata) ? chatData.metadata : null;

    if (!existingState) {
      const question = getDeepQuizQuestion();
      const nextState: QuizDeepState = { question };
      const { error: metadataError } = await supabase
        .from("chats")
        .update({ metadata: nextState, model })
        .eq("id", chatId)
        .eq("user_id", user.id);
      if (metadataError) {
        return Response.json({ error: metadataError.message }, { status: 500 });
      }

      const questionReply = `Question:\n${question}`;
      await saveAssistantMessage(supabase, chatId, questionReply);
      return new Response(questionReply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const { data: usageData, error: usageError } = await supabase
      .from("usage")
      .select("total_tokens")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("day", today)
      .maybeSingle();

    if (usageError) {
      return Response.json({ error: usageError.message }, { status: 500 });
    }

    const usedToday = usageData?.total_tokens ?? 0;
    if (usedToday >= DAILY_TOKEN_LIMIT) {
      return Response.json(
        { error: `${providerLabel} daily token limit reached (${DAILY_TOKEN_LIMIT}/day).` },
        { status: 429 },
      );
    }

    const { error: modelUpdateError } = await supabase
      .from("chats")
      .update({ model })
      .eq("id", chatId)
      .eq("user_id", user.id);
    if (modelUpdateError) {
      return Response.json({ error: modelUpdateError.message }, { status: 500 });
    }

    try {
      const result = await generateText({
        model: getModel(model),
        system: selectedGpt.systemPrompt,
        prompt: [
          "Evaluate the user's answer to the deep JavaScript question.",
          "Return exactly two sections: Evaluation and Model Answer.",
          "",
          `Question: ${existingState.question}`,
          "",
          `User Answer: ${userContent}`,
        ].join("\n"),
      });

      const assistantReply = result.text.trim();
      await saveAssistantMessage(supabase, chatId, assistantReply);

      const inputTokens = result.usage?.inputTokens ?? 0;
      const outputTokens = result.usage?.outputTokens ?? 0;
      const totalTokens = result.usage?.totalTokens ?? inputTokens + outputTokens;

      if (totalTokens > 0) {
        const { data: existingUsage } = await supabase
          .from("usage")
          .select("input_tokens, output_tokens, total_tokens")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .eq("day", today)
          .maybeSingle();

        const nextInput = (existingUsage?.input_tokens ?? 0) + inputTokens;
        const nextOutput = (existingUsage?.output_tokens ?? 0) + outputTokens;
        const nextTotal = (existingUsage?.total_tokens ?? 0) + totalTokens;

        await supabase.from("usage").upsert(
          {
            user_id: user.id,
            provider,
            day: today,
            input_tokens: nextInput,
            output_tokens: nextOutput,
            total_tokens: nextTotal,
          },
          { onConflict: "user_id,provider,day" },
        );
      }

      return new Response(assistantReply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch {
      return Response.json(
        { error: "Failed to evaluate deep quiz answer. Check provider API keys." },
        { status: 500 },
      );
    }
  }

  const { data: usageData, error: usageError } = await supabase
    .from("usage")
    .select("total_tokens")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("day", today)
    .maybeSingle();

  if (usageError) {
    return Response.json({ error: usageError.message }, { status: 500 });
  }

  const usedToday = usageData?.total_tokens ?? 0;
  if (usedToday >= DAILY_TOKEN_LIMIT) {
    return Response.json(
      { error: `${providerLabel} daily token limit reached (${DAILY_TOKEN_LIMIT}/day).` },
      { status: 429 },
    );
  }

  const { error: modelUpdateError } = await supabase
    .from("chats")
    .update({ model })
    .eq("id", chatId)
    .eq("user_id", user.id);

  if (modelUpdateError) {
    return Response.json({ error: modelUpdateError.message }, { status: 500 });
  }

  const prepMs = Math.round(performance.now() - prepStarted);

  try {
    const modelMessages = messages.map((message) => ({
      role: message.role ?? "user",
      content: message.content ?? "",
    }));
    const messagesWithSystemPrompt =
      selectedGpt?.type === "chat"
        ? [{ role: "system" as const, content: selectedGpt.systemPrompt }, ...modelMessages]
        : modelMessages;

    const result = streamText({
      model: getModel(model),
      messages: messagesWithSystemPrompt,
      onFinish: async ({ text, totalUsage }) => {
        if (text.trim()) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            role: "assistant",
            content: text,
          });
        }

        const inputTokens = totalUsage.inputTokens ?? 0;
        const outputTokens = totalUsage.outputTokens ?? 0;
        const totalTokens = totalUsage.totalTokens ?? inputTokens + outputTokens;

        if (totalTokens <= 0) return;

        const { data: existingUsage } = await supabase
          .from("usage")
          .select("input_tokens, output_tokens, total_tokens")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .eq("day", today)
          .maybeSingle();

        const nextInput = (existingUsage?.input_tokens ?? 0) + inputTokens;
        const nextOutput = (existingUsage?.output_tokens ?? 0) + outputTokens;
        const nextTotal = (existingUsage?.total_tokens ?? 0) + totalTokens;

        await supabase.from("usage").upsert(
          {
            user_id: user.id,
            provider,
            day: today,
            input_tokens: nextInput,
            output_tokens: nextOutput,
            total_tokens: nextTotal,
          },
          { onConflict: "user_id,provider,day" },
        );
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": `prep;dur=${prepMs};desc="before-llm"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to generate AI response. Check provider API keys." },
      { status: 500 },
    );
  }
}
