import { clearAllContestData } from '../../lib/db.js';

export async function POST({ request }) {
  const adminKey = process.env.ADMIN_KEY;
  const provided = request.headers.get('x-admin-key');

  if (!adminKey || provided !== adminKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await clearAllContestData();

    return new Response(JSON.stringify({
      success: true,
      message: 'All contest data cleared successfully. Database reset for production use.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Clear data error:', error);
    return new Response(JSON.stringify({ error: 'Failed to clear data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
