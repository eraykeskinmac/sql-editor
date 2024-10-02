import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "No prompt provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are an expert SQL developer. Convert MSSQL queries to PostgreSQL queries accurately. Respond only with the converted SQL query, without any additional explanation or markdown formatting.",
        },
        {
          role: "user",
          content: `Convert the following MSSQL query to PostgreSQL:\n\n${prompt}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error in SQL conversion:", error);
    return new Response(JSON.stringify({ error: "Error in SQL conversion" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
