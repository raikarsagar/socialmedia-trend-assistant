import express from 'express';
import path from 'path';
import { handleCron } from "./controllers/cron";
import { getCronSources } from "./services/getCronSources";
import { scrapeSources } from "./services/scrapeSources";
import { generateDraft } from "./services/generateDraft";
import { searchTrendsByKeywords, searchTwitterTrends } from "./services/searchTrends";
import { generateCounterMeasure } from "./services/generateCounterMeasure";
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory storage for trends (in production, use a database)
let trends: Array<{
  id: string;
  date: string;
  content: string;
  timestamp: Date;
  keywords?: string;
}> = [];

// In-memory storage for counter-measures
let counterMeasures: Array<{
  id: string;
  searchResult: string;
  counterMeasure: string;
  keywords?: string;
  timestamp: Date;
}> = [];

// API endpoint to get all trends
app.get('/api/trends', (req, res) => {
  res.json(trends);
});

// API endpoint to add a new trend
app.post('/api/trends', (req, res) => {
  const { content } = req.body;
  const newTrend = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    content,
    timestamp: new Date()
  };
  trends.unshift(newTrend); // Add to beginning
  res.json(newTrend);
});

// API endpoint to search trends by keywords
app.post('/api/search-trends', async (req, res) => {
  try {
    const { keywords } = req.body;
    
    if (!keywords || keywords.trim() === '') {
      return res.status(400).json({ error: 'Keywords are required' });
    }

    console.log(`Searching for trends with keywords: "${keywords}"`);

    // Search web sources
    console.log('Starting web source search...');
    const webStories = await searchTrendsByKeywords(keywords);
    console.log(`Found ${webStories.length} stories from web sources`);
    
    // Search Twitter/X if API key is available
    console.log('Starting Twitter/X search...');
    const twitterStories = await searchTwitterTrends(keywords);
    console.log(`Found ${twitterStories.length} tweets from Twitter/X`);
    
    // Combine all stories
    const allStories = [...webStories, ...twitterStories];
    console.log(`Total stories found: ${allStories.length}`);
    
    if (allStories.length === 0) {
      console.log('No stories found, creating no-results response');
      const noResultsTrend = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        content: `🔍 Search Results for "${keywords}"\n\nNo recent trends or news found for the specified keywords. Try different terms or check back later.`,
        timestamp: new Date(),
        keywords: keywords
      };
      trends.unshift(noResultsTrend);
      return res.json(noResultsTrend);
    }

    // Generate trend analysis from the found stories
    console.log('Generating trend analysis...');
    const rawStoriesString = JSON.stringify(allStories);
    const draftPost = await generateDraft(rawStoriesString, keywords);
    console.log('Trend analysis completed');
    
    // Store the trend with keywords
    const newTrend = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      content: draftPost!,
      timestamp: new Date(),
      keywords: keywords
    };
    trends.unshift(newTrend);
    
    console.log('Search completed successfully!');
    res.json(newTrend);
  } catch (error: any) {
    console.error('Error searching trends:', error);
    console.log(`Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to search trends' });
  }
});

// API endpoint to generate counter-measure
app.post('/api/generate-counter-measure', async (req, res) => {
  try {
    const { searchResult, keywords } = req.body;
    
    console.log('Received request body:', req.body);
    console.log('Keywords received:', keywords);
    console.log('Keywords type:', typeof keywords);
    
    if (!searchResult || searchResult.trim() === '') {
      return res.status(400).json({ error: 'Search result is required' });
    }

    console.log('Generating counter-measure...');
    const counterMeasure = await generateCounterMeasure(searchResult);
    console.log('Counter-measure generated successfully');
    
    // Store the counter-measure
    const newCounterMeasure = {
      id: Date.now().toString(),
      searchResult,
      counterMeasure,
      keywords,
      timestamp: new Date()
    };
    
    console.log('Storing counter-measure with data:', newCounterMeasure);
    counterMeasures.unshift(newCounterMeasure);
    
    res.json(newCounterMeasure);
  } catch (error: any) {
    console.error('Error generating counter-measure:', error);
    res.status(500).json({ error: 'Failed to generate counter-measure' });
  }
});

// API endpoint to get counter-measure by ID
app.get('/api/counter-measure/:id', (req, res) => {
  const { id } = req.params;
  console.log('Looking for counter-measure with ID:', id);
  console.log('Available counter-measures:', counterMeasures.map(cm => ({ id: cm.id, keywords: cm.keywords })));
  
  const counterMeasure = counterMeasures.find(cm => cm.id === id);
  
  if (!counterMeasure) {
    console.log('Counter-measure not found for ID:', id);
    return res.status(404).json({ error: 'Counter-measure not found' });
  }
  
  console.log('Found counter-measure:', counterMeasure);
  res.json(counterMeasure);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve counter-measure page
app.get('/counter-measure/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/counter-measure.html'));
});

// Modified cron handler to store trends instead of sending via webhook
export const handleCronWithStorage = async (): Promise<void> => {
  try {
    const cronSources = await getCronSources();
    const rawStories = await scrapeSources(cronSources);
    const rawStoriesString = JSON.stringify(rawStories);
    const draftPost = await generateDraft(rawStoriesString);
    
    // Store the trend instead of sending via webhook
    const newTrend = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      content: draftPost!,
      timestamp: new Date()
    };
    trends.unshift(newTrend);
    
    console.log('Trend stored successfully');
  } catch (error) {
    console.error(error);
  }
};

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Run the cron job manually for testing
// handleCronWithStorage();

// If you want to run the cron job automatically, uncomment the following:
// cron.schedule(`0 17 * * *`, async () => {
//   console.log(`Starting process to generate draft...`);
//   await handleCronWithStorage();
// });