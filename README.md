# TrendFinder

A web application that generates and displays AI & LLM trends from various sources.

## Features

- **Web Dashboard**: Beautiful UI to view and manage trend analyses
- **Trend Generation**: Automatically scrapes sources and generates trend summaries
- **Real-time Updates**: Generate new trends on-demand through the web interface
- **Modern Design**: Responsive, modern UI with smooth animations

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Required API keys (see Environment Variables section)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trendFinder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see Environment Variables section)

4. Start the development server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI API Key (required for trend generation)
OPENAI_API_KEY=your_openai_api_key_here

# Firecrawl API Key (optional, for web scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# X (Twitter) API Bearer Token (optional, for Twitter scraping)
X_API_BEARER_TOKEN=your_x_api_bearer_token_here

# Server port (optional, defaults to 3000)
PORT=3000
```

## Usage

### Web Interface

1. **View Trends**: The dashboard displays all generated trends in chronological order
2. **Generate New Trend**: Click the "Generate New Trend" button to create a new analysis
3. **Refresh**: Use the "Refresh Trends" button to reload the trends list

### API Endpoints

- `GET /api/trends` - Get all stored trends
- `POST /api/generate-trend` - Generate a new trend analysis
- `POST /api/trends` - Add a custom trend (requires content in request body)

### Programmatic Usage

You can also use the API programmatically:

```bash
# Generate a new trend
curl -X POST http://localhost:3000/api/generate-trend

# Get all trends
curl http://localhost:3000/api/trends

# Add a custom trend
curl -X POST http://localhost:3000/api/trends \
  -H "Content-Type: application/json" \
  -d '{"content": "Your custom trend content here"}'
```

## Development

### Available Scripts

- `npm start` - Start the development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm test` - Run tests (not implemented yet)

### Project Structure

```
trendFinder/
├── src/
│   ├── controllers/
│   │   └── cron.ts          # Cron job controller
│   ├── services/
│   │   ├── generateDraft.ts  # Trend generation logic
│   │   ├── getCronSources.ts # Source configuration
│   │   ├── scrapeSources.ts  # Web scraping logic
│   │   └── sendDraft.ts      # Webhook sending (legacy)
│   └── index.ts              # Express server setup
├── public/
│   └── index.html            # Web UI
├── package.json
└── README.md
```

## Data Sources

The application scrapes trends from various sources including:

- OpenAI News
- Anthropic News
- Hacker News
- Reuters Technology
- Simon Willison's Blog
- AI News Newsletter
- X (Twitter) accounts (when API key is provided)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License - see LICENSE file for details.
