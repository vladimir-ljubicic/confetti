# 74 — A transient storage failure does not stall the ZIP for a day

**What to build:** A ZIP build that hits a passing storage error keeps going. A failed
photo download is tried again a few times before it counts as a failure, and a build
that does stop on a passing error starts itself again instead of waiting for the nightly
sweep. A genuinely missing or corrupt object still fails the job outright, as it does
now.

**In plain words:**

1. The packer asks Supabase Storage for the next photo and the service answers with a
   passing error, a gateway or rate-limit response rather than "no such object".
2. The packer waits briefly and asks again, a few times over; almost always the photo
   arrives and packing carries on with nobody any the wiser.
3. If every attempt fails, the worker hands the job straight back to a new worker, which
   resumes from the last packed photo within seconds.
4. The couple watching the frozen gallery see the count keep climbing; only a photo that
   is really gone stops the build and marks it failed.

Retry the photo, then restart the worker, and only then give up.

**Blocked by:** None — can start immediately

**Status:** done

- [x] A download answered with a passing error is retried, with a short growing wait
      between attempts, before it throws
- [x] A 400 or 404, and a size that disagrees with the manifest, stay fatal on the first
      answer: no retries, job marked failed
- [x] A slice that ends on a passing error asks for a new worker, the way a slice that
      runs out of time already does
- [x] Repeated restarts cannot spin: a job that keeps failing stops asking, and the
      nightly sweep remains the backstop
- [x] Unit tests cover the retry decision and the restart decision

## Comments

Built on 2026-09-18. A download is attempted four times, waiting 250ms, 500ms and then
1s between attempts; a fatal answer throws on the first one. The restart guard is the
count of photos the slice packed: a slice that packed nothing failed where the last one
failed, so it stops rather than restarting forever. A single bad photo therefore costs
one restart and then waits for the sweep, while a passing blip mid-run costs seconds.

Seen on 2026-09-18 while packing the admin ZIP locally: one photo came back `Bad
Gateway`, the worker recorded the message and returned without asking for a restart, and
the job sat `packing` with no worker for nine minutes until `/api/cron/freeze` was called
by hand. In production the sweep is nightly at 02:00, so the same blip stalls a build for
a day and the frozen gallery shows a ZIP stuck mid-count the whole time.

Today only 400 and 404 are treated as fatal; everything else is already understood to be
passing, but the worker treats a passing error the same as giving up. The deadline path
next to it already does the right thing by returning `retry: true`.
