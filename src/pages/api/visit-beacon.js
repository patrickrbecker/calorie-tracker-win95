import { updateVisitBeacon } from '../../lib/db.js';

// Engagement beacon from index.astro for /stats. Strictly validated; always answers 204 so the
// client never retries or surfaces errors.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VID_RE = /^[A-Za-z0-9-]{8,64}$/;
const SIZE_RE = /^\d{1,5}x\d{1,5}$/;
const SECTIONS = new Set(['tracking', 'standings', 'chart', 'chat', 'getting-started']);

const noContent = () => new Response(null, { status: 204 });

export async function POST({ request }) {
  try {
    const text = await request.text();
    if (text.length > 2000) return noContent();
    const b = JSON.parse(text);
    if (!b || typeof b.pv !== 'string' || !UUID_RE.test(b.pv)) return noContent();

    const int = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);
    await updateVisitBeacon({
      pvId: b.pv,
      visitorId: typeof b.vid === 'string' && VID_RE.test(b.vid) ? b.vid : null,
      screen: typeof b.screen === 'string' && SIZE_RE.test(b.screen) ? b.screen : null,
      viewport: typeof b.viewport === 'string' && SIZE_RE.test(b.viewport) ? b.viewport : null,
      durationMs: int(b.ms, 24 * 60 * 60 * 1000),
      maxScroll: int(b.scroll, 100),
      sections: Array.isArray(b.sections) ? [...new Set(b.sections.filter(s => SECTIONS.has(s)))].join(',') || null : null
    });
  } catch (error) {
    console.error('Visit beacon error:', error.message);
  }
  return noContent();
}
