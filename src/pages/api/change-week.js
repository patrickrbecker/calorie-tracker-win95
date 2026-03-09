import { setCurrentWeek } from '../../lib/db.js';

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
    const { week } = await request.json();

    if (!week || week < 1 || week > 5) {
      return new Response(JSON.stringify({ error: 'Week must be between 1 and 5' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await setCurrentWeek(week);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to update week' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      currentWeek: week
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Change week error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
