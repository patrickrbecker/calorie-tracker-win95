import { getRecentShoutboxMessages } from '../../lib/db.js';

export async function GET({ url }) {
  try {
    // Get limit from query params, default to 20
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    // Security: Validate limit is reasonable
    if (limit < 1 || limit > 100) {
      return new Response(JSON.stringify({ error: 'Limit must be between 1 and 100' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const messages = await getRecentShoutboxMessages(limit);

    return new Response(JSON.stringify({
      success: true,
      // Poster IPs stay server-side (used only by /stats)
      data: messages.map(({ ip, ...msg }) => msg),
      count: messages.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get shouts API error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to get shouts'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}