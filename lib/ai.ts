/**
 * AI enrichment using the custom OpenAI-compatible endpoint.
 */

const AI_ENDPOINT = process.env.AI_ENDPOINT!;
const AI_API_KEY  = process.env.AI_API_KEY!;

export interface EnrichedStory {
  isLegal: boolean;
  title: string;
  summary: string;
  category: string;
  status: 'breaking' | 'ongoing' | 'resolved' | 'unknown';
  keyPeople: {
    defendant?: string;
    plaintiff?: string;
    prosecutor?: string;
  };
  allegations: string[];
}

const SYSTEM_PROMPT = `You are a legal news analyst. Given a news article title and content, extract structured information.

Respond ONLY with valid JSON — no markdown fences, no extra keys:
{
  "isLegal": boolean,
  "title": string,
  "summary": string,
  "category": string,
  "status": "breaking" | "ongoing" | "resolved" | "unknown",
  "keyPeople": { "defendant": string | null, "plaintiff": string | null, "prosecutor": string | null },
  "allegations": string[]
}

Rules:
- isLegal: true only for crime, fraud, lawsuit, arrest, trial, indictment, conviction, settlement stories
- title: clean plain text headline, max 120 chars, no HTML, no clickbait
- summary: 2-3 plain-text sentences. NO HTML TAGS. No <p>, no <b>, no markdown.
- category: one of: Fraud, Homicide, Assault, Corruption, Drug Crime, Financial Crime, Civil Rights, Corporate Crime, Cybercrime, Terrorism, Immigration, Sexual Misconduct, Organized Crime, White Collar, Other
- status: breaking = just arrested/charged/just happened; ongoing = trial/investigation/hearing in progress; resolved = verdict/sentenced/dismissed/acquitted/settled
- keyPeople: real names only, null if unknown
- allegations: plain text strings, empty array if none`;

/** Strip all HTML tags and decode entities */
function stripHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function enrichArticle(
  title: string,
  content: string,
): Promise<EnrichedStory | null> {
  try {
    // Strip HTML from incoming content before sending to AI
    const cleanTitle   = stripHtml(title);
    const cleanContent = stripHtml(content).slice(0, 1500);
    const userMessage  = `Title: ${cleanTitle}\n\nContent: ${cleanContent}`;

    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`AI endpoint error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Strip any accidental markdown fences the model adds
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed: EnrichedStory = JSON.parse(jsonStr);

    // Treat 'unknown' status as 'ongoing' — if it's a legal story worth tracking,
    // it's at minimum an active situation
    if (!parsed.status || parsed.status === 'unknown') parsed.status = 'ongoing';

    // Sanitise every text field coming back from the model
    parsed.title      = stripHtml(parsed.title  || '').slice(0, 120);
    parsed.summary    = stripHtml(parsed.summary || '');
    parsed.category   = stripHtml(parsed.category || 'Other');
    parsed.allegations = (parsed.allegations || []).map(a => stripHtml(a)).filter(Boolean);
    if (parsed.keyPeople) {
      if (parsed.keyPeople.defendant)  parsed.keyPeople.defendant  = stripHtml(parsed.keyPeople.defendant);
      if (parsed.keyPeople.plaintiff)  parsed.keyPeople.plaintiff  = stripHtml(parsed.keyPeople.plaintiff);
      if (parsed.keyPeople.prosecutor) parsed.keyPeople.prosecutor = stripHtml(parsed.keyPeople.prosecutor);
    }

    return parsed;
  } catch (err) {
    console.error('AI enrichment failed:', err);
    return null;
  }
}

/**
 * Ask the AI whether a new article is a follow-up to an existing story.
 * Returns the matching story ID or null.
 *
 * We pass the new article title + up to 3 candidate story titles to the model
 * and ask it to pick the best match (or none).
 */
export async function findMatchingStory(
  newTitle: string,
  candidates: { id: string; title: string }[],
): Promise<string | null> {
  if (!candidates.length) return null;

  const AI_ENDPOINT = process.env.AI_ENDPOINT!;
  const AI_API_KEY  = process.env.AI_API_KEY!;

  const list = candidates.map((c, i) => `${i + 1}. [${c.id}] ${c.title}`).join('\n');

  const prompt = `You are a news deduplication assistant.

New article: "${newTitle}"

Existing tracked stories:
${list}

Is the new article a follow-up, update, or continuation of any of the existing stories above?
Reply with ONLY the story ID (the text inside [...]) if there is a clear match, or reply with "none" if there is no match.
A match means the article is about the same real-world incident, person, or case — not just the same topic.`;

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 60,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;
    const data  = await res.json();
    const reply = (data.choices?.[0]?.message?.content ?? '').trim().toLowerCase();

    if (reply === 'none' || !reply) return null;

    // Extract the ID the model returned
    const match = candidates.find(c => reply.includes(c.id.toLowerCase()));
    return match?.id ?? null;
  } catch {
    return null;
  }
}
export function heuristicExtract(title: string, content: string): EnrichedStory {
  const clean = stripHtml(content);
  const text  = (title + ' ' + clean).toLowerCase();

  const isLegal = [
    'case','court','trial','verdict','sentence','arrest','charge',
    'indictment','plea','conviction','lawsuit','settlement','fraud',
    'crime','criminal','defendant','prosecutor','judge','jury',
  ].some(k => text.includes(k));

  let status: EnrichedStory['status'] = 'ongoing'; // default
  if (['verdict','sentenced','acquitted','dismissed','settled','closed'].some(k => text.includes(k)))
    status = 'resolved';
  else if (['pending','filed','scheduled','awaiting','investigation','probe'].some(k => text.includes(k)))
    status = 'ongoing';
  else if (['arrested','charged','indicted','trial','hearing','pleaded','raid','detained'].some(k => text.includes(k)))
    status = 'breaking';

  let category = 'Other';
  if (['fraud','embezzl','ponzi'].some(k => text.includes(k)))               category = 'Financial Crime';
  else if (['murder','homicide','killing'].some(k => text.includes(k)))      category = 'Homicide';
  else if (['assault','battery'].some(k => text.includes(k)))                category = 'Assault';
  else if (['corrupt','bribe'].some(k => text.includes(k)))                  category = 'Corruption';
  else if (['drug','narco','traffick'].some(k => text.includes(k)))          category = 'Drug Crime';
  else if (['hack','cyber','ransomware'].some(k => text.includes(k)))        category = 'Cybercrime';
  else if (['civil rights','discrimination'].some(k => text.includes(k)))    category = 'Civil Rights';
  else if (['terror','bomb'].some(k => text.includes(k)))                    category = 'Terrorism';
  else if (['sexual','rape','harass'].some(k => text.includes(k)))           category = 'Sexual Misconduct';

  return {
    isLegal,
    title:      title.slice(0, 120),
    summary:    clean.slice(0, 300),
    category,
    status,
    keyPeople:  {},
    allegations:[],
  };
}
