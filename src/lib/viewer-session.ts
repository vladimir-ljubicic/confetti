// A viewer numbered by the turn at the screen it is having, over whatever else
// the gallery holds about that turn. The number tells one turn from the next
// while both are on screen: it keys the viewer, so a session opened over one
// still leaving replaces it rather than being folded into its exit, and a close
// names its own session, so the one on its way out passes over the one that has
// taken its place.
export type ViewerSession<T> = T & { session: number };

export function openedOn<T extends object>(
  open: { session: number } | null,
  showing: T,
): ViewerSession<T> {
  return { ...showing, session: (open?.session ?? 0) + 1 };
}

// What is left open once `session` closes: the session itself is gone, any
// later one stands.
export function withoutSession<T>(
  open: ViewerSession<T> | null,
  session: number,
): ViewerSession<T> | null {
  return open !== null && open.session !== session ? open : null;
}
