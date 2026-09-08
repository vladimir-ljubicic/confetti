// A viewer numbered by the turn at the screen it is having, over whatever else
// the gallery holds about that turn. The number tells one turn from the next
// while both are on screen: it keys the viewer, so a session opened over one
// still leaving replaces it rather than being folded into its exit, and a close
// names its own session, so the one on its way out passes over the one that has
// taken its place.
export type ViewerSession<T> = T & { session: number };

// What a gallery keeps of its viewer: the session on screen, if any, and how
// many there have been. The count outlives a close, so no session is ever
// numbered like an earlier one. A close and an open settled in the same render
// would otherwise hand the new session the closed one's number, and with it the
// closed one's instance, frozen at the end of its exit.
export type ViewerSessions<T> = {
  open: ViewerSession<T> | null;
  opened: number;
};

export const noSessions: ViewerSessions<never> = { open: null, opened: 0 };

export function openedOn<T extends object>(
  sessions: ViewerSessions<T>,
  showing: T,
): ViewerSessions<T> {
  const session = sessions.opened + 1;
  return { open: { ...showing, session }, opened: session };
}

// What is left open once `session` closes: the session itself is gone, any
// later one stands.
export function withoutSession<T>(
  sessions: ViewerSessions<T>,
  session: number,
): ViewerSessions<T> {
  return sessions.open !== null && sessions.open.session === session
    ? { ...sessions, open: null }
    : sessions;
}
