import FirecrawlApp from "@mendable/firecrawl-js";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Initialize Firecrawl
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Define the schema for our expected JSON
const StorySchema = z.object({
  headline: z.string().describe("Story or post headline"),
  link: z.string().describe("A link to the post or story"),
  date_posted: z.string().describe("The date the story or post was published"),
});

const StoriesSchema = z.object({
  stories: z
    .array(StorySchema)
    .describe("A list of stories related to the search terms"),
});

type Story = z.infer<typeof StorySchema>;

// Get search sources - using domain names for site: queries
function getSearchSources(): { webDomains: string[], twitterSource?: string } {
  const hasXApiKey = !!process.env.X_API_BEARER_TOKEN;
  const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;

  const webDomains: string[] = [
    ...(hasFirecrawlKey
      ? [
          "deccanherald.com",
          "thehindu.com",
          "news18.com",
          "thenewsminute.com",
          "republickannada.co.in"
        ]
      : []),
  ];

  const twitterSource = hasXApiKey ? "thenewsminute" : undefined;

  return { webDomains, twitterSource };
}

/**
 * Calculate date one month before current date
 */
function getOneMonthAgoDate(): string {
  const currentDate = new Date();
  const oneMonthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
  return oneMonthAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

/**
 * Search for trends based on specific keywords/terms using Google-style queries
 */
export async function searchTrendsByKeywords(keywords: string): Promise<Story[]> {
  const combinedText: { stories: Story[] } = { stories: [] };
  const { webDomains, twitterSource } = getSearchSources();
  
  console.log(`Searching for trends related to: "${keywords}"`);
  console.log(`Using web domains:`, webDomains);
  console.log(`Using Twitter source:`, twitterSource);

  // Calculate date one month ago
  const oneMonthAgo = getOneMonthAgoDate();
  console.log(`Searching for content after: ${oneMonthAgo}`);

  for (const domain of webDomains) {
    try {
      // Create Google-style search query
      const searchQuery = `site:${domain} ${keywords} after:${oneMonthAgo}`;
      console.log(`Searching with query: ${searchQuery}`);
      
      const promptForFirecrawl = `
Search for news stories, articles, or posts related to "${keywords}" from ${domain} that were published after ${oneMonthAgo}.
Use the search query: "${searchQuery}"

Look for content that mentions or discusses these terms and related topics.

The format should be:
{
  "stories": [
    {
      "headline": "headline1",
      "link": "link1", 
      "date_posted": "YYYY-MM-DD"
    },
    ...
  ]
}
If there are no stories related to these terms, return {"stories": []}.

Return only pure JSON in the specified format (no extra text, no markdown, no \`\`\`).
      `;

      // Use a generic search URL or the domain itself for Firecrawl
      const searchUrl = `https://${domain}`;
      const scrapeResult = await app.extract([searchUrl], {
        prompt: promptForFirecrawl,
        schema: StoriesSchema,
      });

      if (!scrapeResult.success) {
        console.error(`Failed to scrape ${domain}: ${scrapeResult.error}`);
        continue;
      }

      const stories = scrapeResult.data as { stories: Story[] };
      if (!stories || !stories.stories) {
        console.error(`Scraped data from ${domain} does not have a "stories" key.`);
        continue;
      }

      console.log(`Found ${stories.stories.length} stories from ${domain} related to "${keywords}"`);
      combinedText.stories.push(...stories.stories);

    } catch (error: any) {
      if (error.statusCode === 429) {
        console.error(`Rate limit exceeded for ${domain}. Skipping this domain.`);
      } else {
        console.error(`Error scraping domain ${domain}:`, error);
      }
    }
  }

  console.log(`Total web stories found for "${keywords}":`, combinedText.stories.length);
  return combinedText.stories;
}

/**
 * Search for trends using Twitter/X API if available
 */
export async function searchTwitterTrends(keywords: string): Promise<Story[]> {
  const stories: Story[] = [];
  const { twitterSource } = getSearchSources();
  
  if (!process.env.X_API_BEARER_TOKEN || !twitterSource) {
    console.log("X API Bearer Token or Twitter source not available, skipping Twitter search");
    return stories;
  }

  try {
    const tweetStartTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Search for keywords from the specific Twitter account
    const query = `from:${twitterSource} (${keywords}) -is:retweet -is:reply`;
    const encodedQuery = encodeURIComponent(query);
    const encodedStartTime = encodeURIComponent(tweetStartTime);
    const apiUrl = `https://api.x.com/2/tweets/search/recent?query=${encodedQuery}&max_results=20&start_time=${encodedStartTime}`;

    console.log(`Searching Twitter for: ${query}`);

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tweets: ${response.statusText}`);
    }

    const tweets = await response.json();

    if (tweets.meta?.result_count === 0) {
      console.log(`No tweets found for keywords: ${keywords} from ${twitterSource}`);
    } else if (Array.isArray(tweets.data)) {
      console.log(`Found ${tweets.data.length} tweets for keywords: ${keywords} from ${twitterSource}`);
      const twitterStories = tweets.data.map((tweet: any): Story => ({
        headline: tweet.text,
        link: `https://x.com/i/status/${tweet.id}`,
        date_posted: tweetStartTime,
      }));
      stories.push(...twitterStories);
    }

  } catch (error: any) {
    console.error(`Error fetching tweets for keywords "${keywords}":`, error);
  }

  return stories;
} 