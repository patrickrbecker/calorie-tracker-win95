import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let _initPromise;

function ensureInit() {
  if (!_initPromise) _initPromise = initDB();
  return _initPromise;
}

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS calories (
      id SERIAL PRIMARY KEY,
      participant_name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      calories INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(participant_name, date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
  await sql`
    INSERT INTO settings (key, value) VALUES ('current_week', '1')
    ON CONFLICT (key) DO NOTHING
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS shoutbox (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function addParticipant(name) {
  await ensureInit();
  const existing = await sql`SELECT name FROM participants WHERE name = ${name}`;
  if (existing.length > 0) {
    throw new Error('Participant already exists');
  }
  const rows = await sql`INSERT INTO participants (name) VALUES (${name}) RETURNING *`;
  return rows[0];
}

export async function getParticipants() {
  await ensureInit();
  const rows = await sql`SELECT name FROM participants ORDER BY name`;
  return rows.map(r => r.name);
}

export async function addCalories(participantName, date, calories, weekNumber) {
  await ensureInit();
  const rows = await sql`
    INSERT INTO calories (participant_name, date, calories, week_number)
    VALUES (${participantName}, ${date}, ${calories}, ${weekNumber})
    ON CONFLICT (participant_name, date)
    DO UPDATE SET calories = ${calories}
    RETURNING *
  `;
  return rows[0];
}

export async function getWeekData(weekNumber) {
  await ensureInit();
  const rows = await sql`
    SELECT date, participant_name, calories
    FROM calories WHERE week_number = ${weekNumber}
  `;
  const weekData = {};
  rows.forEach(row => {
    const d = row.date instanceof Date
      ? row.date.toISOString().split('T')[0]
      : String(row.date).split('T')[0];
    if (!weekData[d]) weekData[d] = {};
    weekData[d][row.participant_name] = row.calories;
  });
  return weekData;
}

export async function participantExists(name) {
  await ensureInit();
  const rows = await sql`SELECT 1 FROM participants WHERE name = ${name}`;
  return rows.length > 0;
}

export async function getParticipantTotals() {
  await ensureInit();
  const rows = await sql`
    SELECT p.name, COALESCE(SUM(c.calories), 0) AS total_calories
    FROM participants p
    LEFT JOIN calories c ON c.participant_name = p.name
    GROUP BY p.name
    ORDER BY total_calories DESC
  `;
  return rows.map(r => ({ name: r.name, total_calories: Number(r.total_calories) }));
}

export async function getCurrentWeek() {
  await ensureInit();
  const rows = await sql`SELECT value FROM settings WHERE key = 'current_week'`;
  return rows.length > 0 ? parseInt(rows[0].value) || 1 : 1;
}

export async function setCurrentWeek(weekNumber) {
  await ensureInit();
  if (weekNumber >= 1 && weekNumber <= 5) {
    await sql`
      INSERT INTO settings (key, value) VALUES ('current_week', ${weekNumber.toString()})
      ON CONFLICT (key) DO UPDATE SET value = ${weekNumber.toString()}
    `;
    return true;
  }
  return false;
}

export async function clearAllContestData() {
  await ensureInit();
  await sql.transaction([
    sql`DELETE FROM calories`,
    sql`DELETE FROM participants`,
    sql`DELETE FROM shoutbox`,
    sql`UPDATE settings SET value = '1' WHERE key = 'current_week'`,
  ]);
  return true;
}

export async function updateCalories(participantName, date, calories, weekNumber) {
  await ensureInit();
  const existing = await sql`
    SELECT calories FROM calories WHERE participant_name = ${participantName} AND date = ${date}
  `;
  const previousValue = existing.length > 0 ? existing[0].calories : null;

  const rows = await sql`
    INSERT INTO calories (participant_name, date, calories, week_number)
    VALUES (${participantName}, ${date}, ${calories}, ${weekNumber})
    ON CONFLICT (participant_name, date)
    DO UPDATE SET calories = ${calories}
    RETURNING *
  `;
  return { success: true, previousValue, newValue: calories, [previousValue !== null ? 'updated' : 'created']: rows[0] };
}

export async function getAllWeeksData() {
  await ensureInit();
  const rows = await sql`
    SELECT date, participant_name, calories
    FROM calories ORDER BY date, participant_name
  `;
  const allData = {};
  rows.forEach(row => {
    const d = row.date instanceof Date
      ? row.date.toISOString().split('T')[0]
      : String(row.date).split('T')[0];
    if (!allData[d]) allData[d] = {};
    allData[d][row.participant_name] = row.calories;
  });
  return allData;
}

export async function addShoutboxMessage(username, message) {
  await ensureInit();
  if (!username || !message) throw new Error('Username and message are required');
  if (message.length > 500) throw new Error('Message too long (max 500 characters)');

  const rows = await sql`
    INSERT INTO shoutbox (username, message)
    VALUES (${username.trim().substring(0, 255)}, ${message.trim()})
    RETURNING *
  `;
  return rows[0];
}

export async function getRecentShoutboxMessages(limit = 20) {
  await ensureInit();
  const rows = await sql`
    SELECT * FROM shoutbox ORDER BY id DESC LIMIT ${limit}
  `;
  return rows.reverse();
}

export async function deleteShoutboxMessage(messageId) {
  await ensureInit();
  const rows = await sql`
    DELETE FROM shoutbox WHERE id = ${messageId} RETURNING *
  `;
  return rows[0];
}
