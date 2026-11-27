// Google OAuth Token and Workspace API service for Calendar and Tasks
const GOOGLE_TOKEN_KEY = 'google_workspace_oauth_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google_workspace_oauth_expiry';
const GOOGLE_USER_EMAIL_KEY = 'google_workspace_user_email';

export interface GoogleAuthStatus {
  isConnected: boolean;
  userEmail?: string;
  accessToken?: string;
}

export function getStoredGoogleToken(): string | null {
  const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
  const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function getStoredGoogleEmail(): string | null {
  return localStorage.getItem(GOOGLE_USER_EMAIL_KEY) || null;
}

export function saveGoogleToken(token: string, expiresInSeconds: number = 3600, email?: string) {
  localStorage.setItem(GOOGLE_TOKEN_KEY, token);
  localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
  if (email) {
    localStorage.setItem(GOOGLE_USER_EMAIL_KEY, email);
  }
}

export function removeGoogleToken() {
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(GOOGLE_USER_EMAIL_KEY);
}

// Fetch calendar events from Google Calendar API
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<any[]> {
  try {
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=25`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Calendar API returned ${res.status}`);
    }
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || '(제목 없는 일정)',
      date: (item.start?.dateTime || item.start?.date || '').slice(0, 10),
      time: item.start?.dateTime ? item.start.dateTime.slice(11, 16) : undefined,
      type: 'school' as const,
    }));
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}

// Fetch Google Tasks from Tasks API
export async function fetchGoogleTasks(accessToken: string): Promise<any[]> {
  try {
    // 1. Get primary tasklist
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!listsRes.ok) throw new Error(`Tasks API returned ${listsRes.status}`);
    const listsData = await listsRes.json();
    const primaryListId = listsData.items?.[0]?.id || '@default';

    // 2. Get tasks in list
    const tasksRes = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${primaryListId}/tasks?maxResults=30`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!tasksRes.ok) throw new Error(`Tasks items returned ${tasksRes.status}`);
    const tasksData = await tasksRes.json();
    return (tasksData.items || []).map((t: any) => ({
      id: t.id,
      title: t.title || '(새 할 일)',
      dueDate: t.due ? t.due.slice(0, 10) : undefined,
      completed: t.status === 'completed',
    }));
  } catch (error) {
    console.error('Error fetching Google Tasks:', error);
    throw error;
  }
}
