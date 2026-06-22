import Parser from 'rss-parser';
import { FeedItem } from '@/types';

const parser = new Parser({
  timeout: 10_000,
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['media:content',   'mediaContent'],
    ],
  },
});

export async function parseFeed(feedUrl: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items ?? []).map(item => {
      const i = item as unknown as Record<string, unknown>;
      return {
        title:       item.title,
        description: item.contentSnippet || (i.description as string) || '',
        link:        item.link,
        pubDate:     item.pubDate,
        content:     item.content || (i['content:encoded'] as string) || (i.description as string) || '',
        creator:     item.creator,
      };
    });
  } catch (error) {
    console.error(`Failed to parse feed ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Legal RSS feeds — vetted sources covering crime, courts, and fraud.
 * Mix of free public feeds that are reliably available.
 */
export const DEFAULT_CRIME_FEEDS = [
  // ── Dedicated legal outlets ──────────────────────────────────
  // DOJ press releases — official arrest/conviction/settlement notices
  { url: 'https://www.justice.gov/feeds/opa/justice-news.xml',             name: 'DOJ — Justice News' },
  // FBI — press releases on investigations and arrests
  { url: 'https://www.fbi.gov/feeds/fbi-in-the-news/rss.xml',             name: 'FBI — In the News' },
  // Courthouse News — daily court filings and verdicts
  { url: 'https://www.courthousenews.com/feed/',                           name: 'Courthouse News' },
  // Lawfare — national security, courts, executive power
  { url: 'https://www.lawfaremedia.org/feed',                              name: 'Lawfare' },
  // SEC enforcement actions — securities fraud
  { url: 'https://www.sec.gov/rss/litigation/litreleases.xml',             name: 'SEC Enforcement' },
  // ProPublica — investigative, fraud, financial crime
  { url: 'https://feeds.propublica.org/propublica/main',                   name: 'ProPublica' },
  // Above The Law — high-profile cases
  { url: 'https://abovethelaw.com/feed/',                                  name: 'Above the Law' },
  // Reuters Legal
  { url: 'https://feeds.reuters.com/reuters/legalNews',                    name: 'Reuters Legal' },
  // The Intercept — government accountability and crime
  { url: 'https://theintercept.com/feed/?rss',                             name: 'The Intercept' },

  // ── Indian newspapers ────────────────────────────────────────
  // Bar & Bench — India's dedicated legal news outlet
  { url: 'https://www.barandbench.com/feed',                               name: 'Bar & Bench' },
  // The Hindu — national India news (covers courts, crime, CBI, ED)
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss',      name: 'The Hindu — National' },
  // The Hindu — Supreme Court and High Court coverage
  { url: 'https://www.thehindu.com/news/national/other-states/feeder/default.rss', name: 'The Hindu — Other States' },
  // NDTV — breaking India news including crime and court verdicts
  { url: 'https://feeds.feedburner.com/NDTV-LatestNews',                   name: 'NDTV — Latest News' },
  // Hindustan Times — India news feed
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', name: 'Hindustan Times — India' },
  // Indian Express — India news
  { url: 'https://indianexpress.com/feed/',                                 name: 'Indian Express' },
];
