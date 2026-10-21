/** What a source provides: news stories, data series (later phases) or release dates (later phases). */
export type SourceKind = "news" | "data" | "calendar";

/**
 * connected: fetched by the app and working.
 * unverified: a candidate that still has to be tested before it is used.
 * unavailable: no public feed or API we can use.
 * license: data exists but its terms must be reviewed or permission obtained first.
 */
export type SourceAvailability = "connected" | "unverified" | "unavailable" | "license";

export type RegisteredSource = {
  id: string;
  name: { ar: string; en: string };
  home: string;
  kind: SourceKind;
  status: SourceAvailability;
  /** How often a connected source is checked. */
  refreshEveryMs?: number;
  /** Why a source is not connected, shown as is. */
  note?: { ar: string; en: string };
};
