git clone https://github.com/yourusername/mrlister.git
cd mrlister
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DATABASE_URL=your_postgresql_url
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key
XAI_API_KEY=your_xai_key
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
SHOPIFY_ACCESS_TOKEN=your_shopify_token
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/          # Utility functions and hooks
│   │   └── pages/        # Page components
├── server/                # Backend Express application
│   ├── routes/           # API routes
│   ├── services/         # Business logic and services
│   └── lib/             # Utility functions
├── db/                   # Database schema and migrations
└── shared/               # Shared types and utilities