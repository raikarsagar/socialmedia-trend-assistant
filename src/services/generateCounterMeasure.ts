import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate a counter-measure based on search results
 */
export async function generateCounterMeasure(searchResult: string): Promise<string> {
  console.log(`Generating counter-measure for search result...`);

  try {
    // Instantiate the OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are a professional content writer specializing in creating socially appealing and formal counter-measures for news and social issues.

Based on the following search result summary, compose a comprehensive counter-measure that:

1. Acknowledges the issue professionally
2. Provides constructive solutions or alternative perspectives
3. Maintains a formal yet accessible tone
4. Is socially appealing and well-structured
5. Offers actionable recommendations
6. Considers multiple stakeholders' perspectives

Search Result Summary:
${searchResult}

Please provide a well-formatted counter-measure that addresses the key points raised in the search results. Structure it with clear sections and maintain a professional tone throughout.
    `;

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      reasoning_effort: "medium",
      messages: [
        {
          role: "system",
          content: "You are a professional content writer who creates formal, socially appealing counter-measures for news and social issues."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      store: true,
    });

    const counterMeasure = completion.choices[0].message.content;
    if (!counterMeasure) {
      throw new Error("No counter-measure generated");
    }

    return counterMeasure;
  } catch (error) {
    console.error("Error generating counter-measure:", error);
    throw error;
  }
} 