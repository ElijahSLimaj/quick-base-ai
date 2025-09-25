# QuickBase AI

Your Website's Instant AI Support Widget

Turn your website or documents into an AI-powered FAQ in minutes—no code, no training.

## Features

- **Content Ingestion**: Upload documents or crawl websites automatically
- **AI-Powered Q&A**: Intelligent responses with source citations
- **Embeddable Widget**: One-line script to add to any website
- **Admin Dashboard**: Manage projects, view analytics, and customize settings
- **Billing Integration**: Stripe-powered subscription management

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase
- **Database**: PostgreSQL with pgvector for embeddings
- **AI**: OpenAI GPT-4o-mini and text-embedding-3-small
- **Payments**: Stripe
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- OpenAI API key
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quickbase-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Fill in your environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

4. Set up the database:
```bash
# Run the migration in your Supabase dashboard
# Or use the Supabase CLI:
supabase db reset
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
quickbase-ai/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utility functions and configurations
├── supabase/              # Database migrations
├── tests/                 # Test files
└── public/                # Static assets
```

## Deployment

The application is ready for deployment on Vercel, Netlify, or any platform that supports Next.js.

Make sure to set all environment variables in your deployment platform.

## License

MIT License - see LICENSE file for details.# quick-base-ai
