import { deleteShoutboxMessage } from '../../lib/db.js';

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
    const body = await request.json();
    const id = parseInt(body.id);

    if (!id || id < 1) {
      return new Response(JSON.stringify({ error: 'Valid id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deleted = await deleteShoutboxMessage(id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, deleted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete shout error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to delete' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
