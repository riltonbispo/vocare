import { NextRequest, NextResponse } from "next/server";
import { buildCurriculumPrompt, buildEmailPrompt } from "@/lib/prompts";
import { parseGeneratedEmail, extractEmailFromText } from "@/lib/email-utils";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { description, curriculum } = await req.json();

    if (!description?.trim() || !curriculum?.trim()) {
      return NextResponse.json(
        { error: "Descrição da vaga e currículo são obrigatórios." },
        { status: 400 }
      );
    }

    const resultCurriculum = await callGemini(
      buildCurriculumPrompt(description, curriculum)
    );

    const resultEmail = await callGemini(
      buildEmailPrompt(description, resultCurriculum)
    );

    const { subject, body } = parseGeneratedEmail(resultEmail);
    const recruiterEmail = extractEmailFromText(description);

    return NextResponse.json({
      curriculum: resultCurriculum,
      email: resultEmail,
      emailSubject: subject,
      emailBody: body,
      recruiterEmail,
    });

    return NextResponse.json({
      curriculum: resultCurriculum,
      email: resultEmail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar análise." },
      { status: 500 }
    );
  }
}