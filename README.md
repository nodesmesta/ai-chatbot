# AI Chatbot with Next.js

An AI-powered chatbot with automatic web search capabilities and PDF support, built with Next.js 16 and deployed on Vercel.

## Features

- **🔍 Automatic Web Search** - Real-time web search using Tavily API for up-to-date information
- **📄 PDF Extraction** - Extract text content from PDF files for AI analysis
- **📡 Streaming Responses** - Real-time AI responses using Server-Sent Events (SSE)
- **💾 Chat History** - Persistent chat history stored in browser localStorage
- **🤖 NVIDIA NIM Integration** - Powered by NVIDIA's inference microservices (Llama, Mixtral, etc.)
- **🎨 Modern UI** - Clean, responsive interface with Tailwind CSS

## How It Works

1. User sends a message (with or without PDF attachment)
2. For PDF files: text is extracted server-side using pdf-parse
3. Chatbot automatically searches the web for relevant information
4. Search results provide context for the AI response
5. AI generates a response based on the latest information
6. Response is streamed back to the user in real-time

Access the chatbot at `/chat` route.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: NVIDIA NIM (Llama, Mixtral, Qwen, etc.)
- **Search**: Tavily API (web search)
- **PDF Processing**: pdf-parse (server-side text extraction)
- **Deployment**: Vercel (or any Next.js hosting)

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
- `NVIDIA_NIM_MODEL` - Model to use (default: `meta/llama-3.2-90b-vision-instruct`)
- `ENABLE_WEB_SEARCH` - Set to `false` to disable web search (default: true)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/chat](http://localhost:3000/chat) to start chatting!

## Deploying to Production

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy!

Or use the Vercel CLI:

```bash
npm install -g vercel
vercel deploy
```

### Build Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
chatbot-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts      # Chat API with web search
│   │   │   └── extract-pdf/
│   │   │       └── route.ts      # PDF extraction API
│   │   ├── chat/
│   │   │   └── page.tsx          # Chatbot UI
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-interface.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   └── sidebar.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── search.ts         # Tavily search service
│   │   │   └── vectorize.ts      # Optional vector storage
│   │   └── pdf/
│   │       ├── extractor-client.ts
│   │       └── extractor-server.ts
├── .env.example
├── README.md
├── next.config.ts
└── package.json
```

## API Keys Required

### NVIDIA NIM
- **Get API key**: https://build.nvidia.com/
- **Used for**: LLM inference and embeddings
- **Free tier**: Available with signup

### Tavily
- **Get API key**: https://tavily.com/
- **Used for**: Web search
- **Free tier**: 1,000 queries/month

## PDF Extraction

The app supports PDF text extraction:
- Upload PDF files in the chat interface
- Text is extracted server-side using `pdf-parse`
- Extracted content is sent to the AI for analysis
- Supports text-based PDFs (not image-only PDFs)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NVIDIA NIM Documentation](https://docs.api.nvidia.com/)
- [Tavily API Documentation](https://docs.tavily.com/)
- [Vercel Documentation](https://vercel.com/docs)
