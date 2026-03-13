import { addCalories, participantExists } from '../../lib/db.js';

export async function POST({ request }) {
  try {
    const { date, participant, calories, week } = await request.json();

    const trimmedParticipant = participant?.trim();

    if (!date || !trimmedParticipant || calories === undefined || !week) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate calories is a number and within reasonable range
    const numCalories = parseInt(calories);
    if (isNaN(numCalories) || numCalories < 0 || numCalories > 50000) {
      return new Response(JSON.stringify({ error: 'Calories must be between 0 and 50,000' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security: Validate week number
    if (week < 1 || week > 5) {
      return new Response(JSON.stringify({ error: 'Invalid week number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if participant exists
    if (!(await participantExists(trimmedParticipant))) {
      return new Response(JSON.stringify({ error: 'Participant not found. Please add them first.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PIN protection for specific user
    const protectedUser = process.env.PROTECTED_USER;
    const protectedPin = process.env.PROTECTED_PIN;
    if (protectedUser && trimmedParticipant === protectedUser) {
      const pin = request.headers.get('x-user-pin');
      if (!pin || pin !== protectedPin) {
        return new Response(JSON.stringify({ error: 'Incorrect PIN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    await addCalories(trimmedParticipant, date, numCalories, week);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Added ${numCalories} calories for ${trimmedParticipant} on ${date}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add calories error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}