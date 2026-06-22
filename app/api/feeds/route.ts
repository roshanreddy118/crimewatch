import { NextRequest, NextResponse } from 'next/server';
import { parseFeed, DEFAULT_CRIME_FEEDS } from '@/lib/rss-parser';
import { enrichArticle, heuristicExtract, findMatchingStory } from '@/lib/ai';
import {
  initializeDatabase,
  getActiveRSSFeeds,
  addRSSFeed,
  createCase,
  updateCaseStatus,
  updateCaseDescription,
  addCaseUpdate,
  updateFeedLastChecked,
  searchCases,
  updateExistsForCase,
} from '@/lib/db';

/* ─────────────────────────────────────────────────────────────
   Auth helper.
   In production: Vercel Cron sends CRON_SECRET as Bearer token.
   In local dev: no CRON_SECRET = open (fine for localhost).
───────────────────────────────────────────────────────────── */
function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local dev — no secret configured, allow all
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/* ─────────────────────────────────────────────────────────────
   GET /api/feeds  — init DB schema + register default feeds
   Call this once after deployment to set up the database.
───────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    await initializeDatabase();
    for (const feed of DEFAULT_CRIME_FEEDS) {
      await addRSSFeed(feed.url, feed.name);
    }
    const feeds = await getActiveRSSFeeds();
    return NextResponse.json({ success: true, data: feeds });
  } catch (error) {
    console.error('GET /api/feeds error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────────────────
   POST /api/feeds  — ingestion pipeline (called by Vercel Cron)

   How timeline linking works:
   1. Fetch each RSS feed and enrich articles with AI
   2. Skip non-legal articles
   3. Search existing stories for keyword overlap (pre-filter)
   4. AI decides if the new article is a follow-up to an existing story
   5a. Match → add as timeline update, escalate status if needed
   5b. No match → create new story
───────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  // Skip auth check only in local dev (no CRON_SECRET set)
  if (process.env.CRON_SECRET && !isAuthorised(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }

  const stats = { storiesCreated: 0, updatesAdded: 0, skipped: 0, feedsProcessed: 0, errors: 0 };

  try {
    const feeds = await getActiveRSSFeeds();

    for (const feed of feeds) {
      try {
        const items = await parseFeed(feed.feedUrl);
        console.log(`[${feed.feedName}] ${items.length} items`);

        for (const item of items) {
          if (!item.link) { stats.skipped++; continue; }

          // ── Step 1: Enrich with AI (heuristic fallback) ────────
          const raw = item.content || item.description || '';
          let enriched = await enrichArticle(item.title ?? '', raw);
          if (!enriched) enriched = heuristicExtract(item.title ?? '', raw);
          if (!enriched.isLegal) { stats.skipped++; continue; }

          // ── Step 2: Keyword pre-filter ─────────────────────────
          const keywords = enriched.title
            .replace(/[^a-zA-Z0-9 ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 4)
            .join(' ');

          const candidates = keywords ? await searchCases(keywords) : [];

          // ── Step 3: Match check ────────────────────────────────
          let matchedStoryId: string | null = null;

          if (candidates.length > 0) {
            const newWords = new Set(
              enriched.title.toLowerCase().split(/\W+/).filter(w => w.length > 3)
            );
            const fastMatch = candidates.find(c => {
              const cWords  = new Set(c.title.toLowerCase().split(/\W+/).filter(w => w.length > 3));
              const overlap = [...newWords].filter(w => cWords.has(w)).length;
              return overlap / Math.max(newWords.size, 1) >= 0.5;
            });
            matchedStoryId = fastMatch?.id ?? await findMatchingStory(
              enriched.title,
              candidates.slice(0, 5).map(c => ({ id: c.id, title: c.title })),
            );
          }

          // ── Step 4a: Matched — add timeline update ─────────────
          if (matchedStoryId) {
            if (await updateExistsForCase(matchedStoryId, item.link)) {
              stats.skipped++; continue;
            }
            const matched = candidates.find(c => c.id === matchedStoryId)!;
            await addCaseUpdate(matchedStoryId, {
              updateText: enriched.summary,
              sourceUrl:  item.link,
              updateDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            });
            const order: Record<string, number> = { ongoing: 0, breaking: 1, resolved: 2 };
            if ((order[enriched.status] ?? 0) > (order[matched.status] ?? 0)) {
              await updateCaseStatus(matchedStoryId, enriched.status);
            }
            if (enriched.summary.length > (matched.description?.length ?? 0)) {
              await updateCaseDescription(matchedStoryId, enriched.summary);
            }
            stats.updatesAdded++;

          // ── Step 4b: No match — new story ──────────────────────
          } else {
            await createCase({
              title:       enriched.title,
              description: enriched.summary,
              caseType:    enriched.category,
              jurisdiction: 'India',
              parties: {
                defendant:  enriched.keyPeople.defendant  ?? undefined,
                plaintiff:  enriched.keyPeople.plaintiff  ?? undefined,
                prosecutor: enriched.keyPeople.prosecutor ?? undefined,
              },
              charges:     enriched.allegations,
              status:      enriched.status,
              sourceUrl:   item.link,
              sourcesFeed: feed.feedName,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            });
            stats.storiesCreated++;
          }
        }

        await updateFeedLastChecked(feed.id);
        stats.feedsProcessed++;
      } catch (feedError) {
        console.error(`Error on feed "${feed.feedName}":`, feedError);
        stats.errors++;
      }
    }

    console.log('Ingestion done:', stats);
    return NextResponse.json({ success: true, stats });

  } catch (error) {
    console.error('POST /api/feeds fatal:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
