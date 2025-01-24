import dotenv from 'dotenv';
import Together from 'together-ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { OpenAI } from 'openai';

dotenv.config();

/**
 * Generate a post draft with trending ideas based on raw tweets.
 */
export async function generateDraft(rawStories: string) {
  console.log(`Generating a post draft with raw stories (${rawStories.length} characters)...`)

  try {
    // Initialize Together client
    const openai = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });



    // Create a date string if you need it in the post header
    const currentDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'numeric',
      day: 'numeric',
    });

    // Use Together’s chat completion with the Llama 3.1 model
    const completion = await openai.chat.completions.create({
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content: `You are given a list of raw AI and LLM-related tweets sourced from X/Twitter.
Only respond in valid JSON that matches the provided schema (no extra keys).
`,
        },
        {
          role: 'user',
          content: `Your task is to find interesting trends, launches, or interesting examples from the tweets or stories. 
For each tweet or story, provide a 'story_or_tweet_link' and a one-sentence 'description'. 
Return all relevant tweets or stories as separate objects. 
Aim to pick at least 10 tweets or stories unless there are fewer than 10 available. If there are less than 10 tweets or stories, return ALL of them. 

You should only return the JSON object, no other text or comments. The JSON object should be in this format:
{
  "interestingTweetsOrStories": [
    {
      "story_or_tweet_link": "https://x.com/...",
      "description": "..."
    },
    ...
  ]
}

You should not return the \`\`\`json or \`\`\`json\`\`\` tags only the JSON object itself.

Here are the raw tweets or stories you can pick from:\n\n${rawStories}\n\n`
        },
      ],
      // Tell Together to strictly enforce JSON output that matches our schema
      // @ts-ignore
    });

    // Check if we got a content payload in the first choice
    const rawJSON = completion?.choices?.[0]?.message?.content;
    if (!rawJSON) {
      console.log("No JSON output returned from Together.");
      return "No output.";
    }
    console.log(rawJSON);

    // Parse the JSON to match our schema
    const parsedResponse = JSON.parse(rawJSON);

    // Construct the final post
    const header = `🚀 AI and LLM Trends on X for ${currentDate}\n\n`;
    const draft_post = header + parsedResponse.interestingTweetsOrStories
      .map((tweetOrStory: any) => `• ${tweetOrStory.description}\n  ${tweetOrStory.story_or_tweet_link}`)
      .join('\n\n');

    return draft_post;

  } catch (error) {
    console.error("Error generating draft post", error);
    return "Error generating draft post.";
  }
}
