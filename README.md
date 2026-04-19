# Next.js Framework Starter with AI Chatbot

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/next-starter-template)

## Overview

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It's deployed on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

## AI Chatbot Features

This project includes a fully functional AI chatbot with **automatic web search** capabilities:

### Core Features
- **🔍 Automatic Web Search** - Every response includes real-time web search using Tavily API
- **📡 Streaming Responses** - Real-time AI responses using Server-Sent Events (SSE)
- **💾 Chat History** - Persistent chat history in browser localStorage
- **🤖 NVIDIA NIM Integration** - Powered by NVIDIA's inference microservices
- **☁️ Cloudflare Vectorize** - Optional vector storage for search results
- **📝 Markdown Rendering** - Beautifully formatted AI responses with code blocks, lists, etc.
- **📄 PDF OCR Support** - Image-based PDF scanning using Llama 3.2 Vision (requires Ghostscript)

### How It Works

1. User sends a message
2. Chatbot automatically searches the web for relevant information using Tavily API
3. Search results are used as context for the AI
4. AI generates a response based on the latest information
5. Response is streamed back to the user in real-time

Access the chatbot at `/chat` route.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: NVIDIA NIM (Qwen, Llama, Mixtral, etc.)
- **Search**: Tavily API (web search)
- **Vector Store**: Cloudflare Vectorize (optional)
- **Deployment**: Cloudflare Workers via OpenNext

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NVIDIA_NIM_API_KEY` - Get from https://build.nvidia.com/
- `TAVILY_API_KEY` - Get from https://tavily.com/

Optional:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - For Vectorize integration
- `ENABLE_WEB_SEARCH` - Set to `true` to enable web search (default: true)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/chat](http://localhost:3000/chat) to start chatting!

## Deploying To Production

| Command | Action |
| :-------------------------------- | :------------------------------------------- |
| `npm run build` | Build your production site |
| `npm run preview` | Preview your build locally, before deploying |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare |
| `npm wrangler tail` | View real-time logs for all Workers |

## Project Structure

```
chatbot-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts          # Chat API with web search
│   │   ├── chat/
│   │   │   └── page.tsx              # Chatbot UI
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── search.ts                 # Tavily search service
│   │   └── vectorize.ts              # Cloudflare Vectorize service
├── .env.example
├── README.md
├── WEB_SEARCH_GUIDE.md               # Web search documentation
└── package.json
```

## API Keys Required

### NVIDIA NIM
- Get API key: https://build.nvidia.com/
- Used for: LLM inference and embeddings

### Tavily
- Get API key: https://tavily.com/
- Free tier: 1,000 queries/month
- Used for: Web search

### Cloudflare (Optional)
- Get from: Cloudflare Dashboard
- Used for: Vectorize storage

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NVIDIA NIM Documentation](https://docs.api.nvidia.com/)
- [Tavily API Documentation](https://docs.tavily.com/)
- [Cloudflare Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
