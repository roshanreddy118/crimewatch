export interface CrimeCase {
  id: string;
  title: string;
  description: string;
  caseType: string;       // repurposed as news category
  jurisdiction: string;
  parties: {
    plaintiff?: string;
    defendant?: string;
    prosecutor?: string;
  };
  charges?: string[];
  status: 'breaking' | 'ongoing' | 'resolved';
  sourceUrl: string;
  sourcesFeed: string;
  publishedAt: Date;      // actual article publish date from RSS pubDate
  createdAt: Date;        // when we ingested it
  updatedAt: Date;
}

export interface CaseUpdate {
  id: string;
  caseId: string;
  updateText: string;
  updateDate: Date;
  sourceUrl: string;
  createdAt: Date;
}

export interface RSSFeed {
  id: string;
  feedUrl: string;
  feedName: string;
  lastChecked: Date;
  active: boolean;
}

export interface FeedItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  creator?: string;
}
