/** Short, collision-unlikely id for client-side entities (sessions, messages). */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
