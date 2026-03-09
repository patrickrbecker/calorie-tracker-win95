// In-memory data store for local development (no Postgres needed)
// Attached to globalThis so it survives Vite/Astro hot reloads.

if (!globalThis.__calorieStore) {
  const today = new Date();
  const day = today.getDate();
  const initialWeek = Math.min(Math.ceil(day / 7), 5);

  globalThis.__calorieStore = {
    participants: ['Pat'],
    calories: [],
    settings: { current_week: initialWeek.toString() },
    shoutbox: [],
    nextId: 1,
    nextShoutId: 1,
  };
}

const store = globalThis.__calorieStore;

export async function initDB() {}

export async function addParticipant(name) {
  if (store.participants.includes(name)) {
    throw new Error('Participant already exists');
  }
  store.participants.push(name);
  store.participants.sort();
  return { id: store.nextId++, name, created_at: new Date() };
}

export async function getParticipants() {
  return [...store.participants];
}

export async function addCalories(participantName, date, calories, weekNumber) {
  const existing = store.calories.find(c => c.participant_name === participantName && c.date === date);
  if (existing) {
    existing.calories = calories;
    return existing;
  }
  const entry = { id: store.nextId++, participant_name: participantName, date, calories, week_number: weekNumber, created_at: new Date() };
  store.calories.push(entry);
  return entry;
}

export async function getWeekData(weekNumber) {
  const weekData = {};
  store.calories
    .filter(c => c.week_number === weekNumber)
    .forEach(row => {
      if (!weekData[row.date]) weekData[row.date] = {};
      weekData[row.date][row.participant_name] = row.calories;
    });
  return weekData;
}

export async function participantExists(name) {
  return store.participants.includes(name);
}

export async function getParticipantTotals() {
  return store.participants.map(name => {
    const total = store.calories
      .filter(c => c.participant_name === name)
      .reduce((sum, c) => sum + c.calories, 0);
    return { name, total_calories: total };
  }).sort((a, b) => b.total_calories - a.total_calories);
}

export async function getCurrentWeek() {
  return parseInt(store.settings.current_week) || 1;
}

export async function setCurrentWeek(weekNumber) {
  if (weekNumber >= 1 && weekNumber <= 5) {
    store.settings.current_week = weekNumber.toString();
    return true;
  }
  return false;
}

export async function clearAllContestData() {
  store.participants.length = 0;
  store.calories.length = 0;
  store.settings.current_week = '1';
  store.shoutbox.length = 0;
  return true;
}

export async function updateCalories(participantName, date, calories, weekNumber) {
  const existing = store.calories.find(c => c.participant_name === participantName && c.date === date);
  const previousValue = existing ? existing.calories : null;

  if (existing) {
    existing.calories = calories;
    return { success: true, previousValue, newValue: calories, updated: existing };
  }
  const entry = { id: store.nextId++, participant_name: participantName, date, calories, week_number: weekNumber, created_at: new Date() };
  store.calories.push(entry);
  return { success: true, previousValue: null, newValue: calories, created: entry };
}

export async function getAllWeeksData() {
  const allData = {};
  store.calories
    .sort((a, b) => a.date.localeCompare(b.date) || a.participant_name.localeCompare(b.participant_name))
    .forEach(row => {
      if (!allData[row.date]) allData[row.date] = {};
      allData[row.date][row.participant_name] = row.calories;
    });
  return allData;
}

export async function addShoutboxMessage(username, message) {
  if (!username || !message) throw new Error('Username and message are required');
  if (message.length > 500) throw new Error('Message too long (max 500 characters)');

  const entry = {
    id: store.nextShoutId++,
    username: username.trim().substring(0, 255),
    message: message.trim(),
    created_at: new Date().toISOString(),
  };
  store.shoutbox.push(entry);
  return entry;
}

export async function getRecentShoutboxMessages(limit = 20) {
  return store.shoutbox.slice(-limit);
}

export async function deleteShoutboxMessage(messageId) {
  const idx = store.shoutbox.findIndex(m => m.id === messageId);
  if (idx >= 0) {
    const [removed] = store.shoutbox.splice(idx, 1);
    return removed;
  }
  return undefined;
}
