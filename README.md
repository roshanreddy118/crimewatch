# Crime Case Monitor

A modern web application that tracks major crime cases from legal RSS feeds and provides real-time monitoring of case developments.

## Features

- **Daily Case Feed**: Aggregates crime cases from multiple legal RSS feeds
- **Case Tracking**: Monitor status updates and developments for each case
- **Advanced Search**: Filter cases by keywords, jurisdiction, and status
- **Case Timeline**: View the chronological history of case updates
- **Real-time Updates**: Automatic feed aggregation every 6 hours
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Serverless Functions
- **Database**: PostgreSQL (Vercel Postgres or Neon)
- **RSS Parsing**: rss-parser
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (local or cloud)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd crime-case-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your database URL:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/crime_monitor
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Initialize the database**
   ```bash
   npm run db:init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Create a Vercel Project

```bash
npm install -g vercel
vercel
```

### 2. Connect Database

- Use Vercel's marketplace to create a Neon PostgreSQL database
- Or connect an existing PostgreSQL instance

### 3. Add Environment Variables

In the Vercel dashboard, add:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXT_PUBLIC_API_URL`: Your production URL (e.g., https://yourdomain.vercel.app)
- `CRON_SECRET`: A random secret for cron job authentication

### 4. Configure Cron Jobs

The `vercel.json` file already configures automatic feed processing every 6 hours.

### 5. Deploy

```bash
vercel --prod
```

Or push to GitHub and enable automatic deployments in Vercel dashboard.

## API Endpoints

### Cases
- `GET /api/cases` - Get all cases (with pagination)
- `GET /api/cases?q=search` - Search cases
- `GET /api/cases?jurisdiction=Federal&status=active` - Filter cases
- `GET /api/cases/[id]` - Get case details with updates
- `POST /api/cases/[id]` - Add update to a case

### Feeds
- `GET /api/feeds` - Initialize default feeds
- `POST /api/feeds` - Process feeds (cron job)

## Database Schema

### cases
- `id`: UUID primary key
- `title`: Case title
- `description`: Case description
- `case_type`: Type of case (criminal, civil, etc.)
- `jurisdiction`: Court jurisdiction
- `parties`: JSON object with plaintiff, defendant, prosecutor
- `charges`: Array of charges
- `status`: active, pending, closed, appeal
- `source_url`: Link to source
- `source_feed`: RSS feed source
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### case_updates
- `id`: UUID primary key
- `case_id`: Reference to case
- `update_text`: Update content
- `update_date`: Date of update
- `source_url`: Link to update source
- `created_at`: Creation timestamp

### rss_feeds
- `id`: UUID primary key
- `feed_url`: RSS feed URL
- `feed_name`: Feed name/title
- `last_checked`: Last check timestamp
- `active`: Is feed active
- `created_at`: Creation timestamp

## RSS Feeds

The application includes default legal RSS feeds:
- LawFare - Courts
- LawFare - National Security
- ABA Journal
- Lawyers and Settlements
- Bloomberg Markets (Financial Crime)

Add more feeds via the API or database.

## Development

### Project Structure

```
crime-case-monitor/
├── app/
│   ├── page.tsx              # Home page
│   ├── cases/[id]/page.tsx   # Case detail page
│   ├── api/
│   │   ├── cases/route.ts    # Cases API
│   │   └── feeds/route.ts    # Feed aggregator
│   └── layout.tsx            # Root layout
├── components/
│   ├── CaseCard.tsx          # Case card component
│   ├── SearchFilter.tsx      # Search/filter component
│   └── Timeline.tsx          # Update timeline
├── lib/
│   ├── db.ts                 # Database functions
│   └── rss-parser.ts         # RSS parsing logic
├── types/
│   └── index.ts              # TypeScript types
└── public/                   # Static assets
```

### Adding More RSS Feeds

Edit `lib/rss-parser.ts` and add to `DEFAULT_CRIME_FEEDS`:

```typescript
{
  url: 'https://feeds.example.com/legal',
  name: 'Example Legal Feed',
}
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Check firewall rules for cloud databases

### Empty Feed
- Run `curl http://localhost:3000/api/feeds` to initialize feeds
- Check if RSS feed URLs are still valid
- Review application logs for parsing errors

### Deployment Issues
- Check Vercel deployment logs
- Verify environment variables are set in Vercel dashboard
- Ensure cron jobs are configured in `vercel.json`

## Future Enhancements

- User authentication and favorites
- Email/SMS notifications for case updates
- Advanced filtering and sorting
- Case outcome predictions using ML
- Integration with more legal databases
- Dark mode support
- Mobile app

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
