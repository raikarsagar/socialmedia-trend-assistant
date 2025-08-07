import dotenv from "dotenv";

dotenv.config();

export async function getCronSources(): Promise<{ identifier: string }[]> {
  try {
    console.log("Fetching sources...");

    // Check for required API keys
    const hasXApiKey = !!process.env.X_API_BEARER_TOKEN;
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;

    // Define sources based on available API keys
    const sources: { identifier: string }[] = [
      ...(hasFirecrawlKey
        ? [
            { identifier: "https://www.thehindu.com/news/national/karnataka/" },
            { identifier: "https://www.deccanherald.com/top-karnataka-news" },
            { identifier: "https://www.news18.com/india/" },
            { identifier: "https://www.thenewsminute.com/news/karnataka" },
            { identifier: "https://www.republickannada.co.in/" },
          ]
        : []),
      ...(hasXApiKey ? [{ identifier: "https://x.com/thenewsminute" }] : []),
    ];

    // Return the full objects instead of mapping to strings
    return sources;
  } catch (error) {
    console.error(error);
    return [];
  }
}
