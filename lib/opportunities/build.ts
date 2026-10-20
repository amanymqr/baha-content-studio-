import { opportunityScore, type Score, type Category } from "../analysis/score";
import type { NewsItem } from "../news/types";
import { ANGLES, type AngleRule, type Audience, type Format } from "./angles";

export type RankedStory = { item: NewsItem; opportunity: Score; relevance: Score; category: Category };
export type Opportunity = { key: string; story: RankedStory; angle: AngleRule };

/** Scores every distinct story (duplicates are left out) and sorts by relevance, then opportunity. */
export function rankStories(items: NewsItem[], now = Date.now()): RankedStory[] {
  return items
    .filter((i) => !i.duplicateOf)
    .map((item) => {
      const o = opportunityScore(item, now);
      return { item, opportunity: { value: o.value, reasons: o.reasons }, relevance: o.relevance, category: o.category };
    })
    .sort((a, b) => b.relevance.value - a.relevance.value || b.opportunity.value - a.opportunity.value || (b.item.publishedAt ?? "").localeCompare(a.item.publishedAt ?? ""));
}

export type OpportunityFilter = { audience?: Audience; format?: Format; minRelevance?: number };

/**
 * One opportunity per angle rule per story. Stories below the relevance floor
 * (default 30) produce no angles, so general economic news rarely shows up.
 */
export function buildOpportunities(stories: RankedStory[], f: OpportunityFilter = {}): Opportunity[] {
  const floor = f.minRelevance ?? 30;
  const out: Opportunity[] = [];
  for (const story of stories) {
    if (story.relevance.value < floor) continue;
    for (const angle of ANGLES[story.category]) {
      if (f.audience && !angle.audiences.includes(f.audience)) continue;
      if (f.format && angle.format !== f.format) continue;
      out.push({ key: `${story.item.id}:${angle.id}`, story, angle });
    }
  }
  return out.sort((a, b) => b.story.opportunity.value - a.story.opportunity.value);
}
