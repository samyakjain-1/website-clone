import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

async function callLLM({ layout, screenshot, apiKey }: { layout: any; screenshot: string; apiKey: string }) {
  const openai = new OpenAI({ apiKey });

  // Limit layout arrays to 5 items each for brevity
  function limitArray(arr: any[]) {
    return Array.isArray(arr) ? arr.slice(0, 5) : [];
  }
  const limitedLayout = {
    navs: limitArray(layout.navs),
    sections: limitArray(layout.sections),
    buttons: limitArray(layout.buttons),
    headings: limitArray(layout.headings),
    textBlocks: limitArray(layout.textBlocks),
  };

  // Compose a concise layout summary
  const layoutSummary = JSON.stringify(limitedLayout, null, 2);

  // Prepare the image as a data URL
  const imageDataUrl = `data:image/png;base64,${screenshot}`;

  const prompt =
    "You are a web developer assistant. Given the following website screenshot and a summary of its layout, generate clean, cloneable HTML and CSS that mimics the site's layout and style.\n" +
    "- Only output the code, no explanations.\n" +
    "- Separate HTML and CSS clearly, e.g. with <!-- HTML --> and <!-- CSS --> comments.\n" +
    "- Use semantic HTML where possible.\n" +
    "- Inline images with placeholders if needed.\n\n" +
    "Layout summary:\n" +
    layoutSummary +
    "\n\nOutput:";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant that generates HTML and CSS clones of website layouts." },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content || "";
  // Try to extract HTML and CSS from the response
  const htmlMatch = content.match(/<!--\s*HTML\s*-->([\s\S]*?)(<!--\s*CSS\s*-->|$)/i);
  const cssMatch = content.match(/<!--\s*CSS\s*-->([\s\S]*)/i);

  return {
    html: htmlMatch ? htmlMatch[1].trim() : content.trim(),
    css: cssMatch ? cssMatch[1].trim() : "",
    raw: content,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { layout, screenshot, apiKey } = await req.json();
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!layout || !screenshot) {
      return NextResponse.json({ error: "Missing layout or screenshot" }, { status: 400 });
    }
    if (!key) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
    }
    const result = await callLLM({ layout, screenshot, apiKey: key });
    return NextResponse.json({ html: result.html, css: result.css });
  } catch (err: any) {
    // Log error details for debugging
    console.error("OpenAI error:", err);
    let message = "Failed to generate code";
    if (err?.response?.data?.error?.message) {
      message = err.response.data.error.message;
    } else if (err?.message) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
