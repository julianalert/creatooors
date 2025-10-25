# Supabase Environment Setup

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## How to Get Your Supabase Credentials

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings → API**
3. **Copy the following values:**
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

Make sure your `creator` table exists with the correct schema:

```sql
CREATE TABLE creator (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  platform TEXT,
  profile_data JSONB,
  scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_creator_platform ON creator(platform);
CREATE INDEX idx_creator_scraped_at ON creator(scraped_at);
```

## Testing the Connection

After setting up the environment variables, restart your development server:

```bash
npm run dev
```

Then test the API endpoint:

```bash
curl -X POST http://localhost:3000/api/creator \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/test"}'
```

## Troubleshooting

- **"Environment variable not found"** → Check that `.env.local` exists and has the correct variable names
- **"Invalid API key"** → Verify your Supabase credentials are correct
- **"Table doesn't exist"** → Run the SQL schema creation script in your Supabase SQL editor
- **"Permission denied"** → Make sure you're using the service_role key for server-side operations
