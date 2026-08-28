import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { COUPLE_NAMES } from "@/lib/couple";
import { getDictionary } from "@/lib/dictionaries";
import {
  DEFAULT_EVENT_DATE_ISO,
  formatEventDate,
} from "@/lib/event-schedule";
import { getEventSettings } from "@/lib/event-settings";
import { DEFAULT_LOCALE } from "@/lib/i18n";

// The card is scraped without cookies, so it always speaks the default locale.
const dict = getDictionary(DEFAULT_LOCALE);
const names = COUPLE_NAMES[DEFAULT_LOCALE];

export const alt = `${names.oneLine} — ${dict.meta.description}`;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

// The event date can be changed in the admin, and a card cached forever would
// keep showing the old one.
export const revalidate = 3600;

const cormorant = await readFile(
  join(process.cwd(), "assets/CormorantGaramond-Medium.ttf"),
);
const jost = await readFile(join(process.cwd(), "assets/Jost-Regular.ttf"));

// Gold flecks scattered around the names, mirroring the mark in the app.
const FLECKS = [
  { left: 150, top: 120, rotate: -18, color: "#b08d3c" },
  { left: 262, top: 386, rotate: 34, color: "#d9b866" },
  { left: 986, top: 168, rotate: 22, color: "#d9b866" },
  { left: 1042, top: 452, rotate: -12, color: "#b08d3c" },
  { left: 596, top: 74, rotate: 8, color: "#e7dfcd" },
];

export default async function Image() {
  // Fail open: a settings outage must not cost the card its date.
  const settings = await getEventSettings().catch(() => ({
    eventDateIso: DEFAULT_EVENT_DATE_ISO,
  }));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#faf6ee",
          fontFamily: "Jost",
        }}
      >
        {FLECKS.map((fleck, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: fleck.left,
              top: fleck.top,
              width: 12,
              height: 26,
              borderRadius: 2,
              background: fleck.color,
              transform: `rotate(${fleck.rotate}deg)`,
            }}
          />
        ))}

        <div
          style={{
            fontSize: 24,
            letterSpacing: 12,
            color: "#b08d3c",
            paddingLeft: 12,
          }}
        >
          {dict.gallery.eyebrow.toLocaleUpperCase(DEFAULT_LOCALE)}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 26,
            marginTop: 34,
            fontFamily: "Cormorant Garamond",
            fontSize: 116,
            color: "#8a6d2c",
          }}
        >
          <span>{names.first}</span>
          <span style={{ fontSize: 78, color: "#b08d3c" }}>{names.and}</span>
          <span>{names.second}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 44,
            color: "#2b2620",
          }}
        >
          <div style={{ width: 64, height: 1, background: "#cdc4b0" }} />
          <div style={{ fontSize: 26, letterSpacing: 6, opacity: 0.7 }}>
            {formatEventDate(settings.eventDateIso, " · ")}
          </div>
          <div style={{ width: 64, height: 1, background: "#cdc4b0" }} />
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 27,
            color: "#2b2620",
            opacity: 0.62,
          }}
        >
          {dict.meta.description}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jost", data: jost, style: "normal", weight: 400 },
        {
          name: "Cormorant Garamond",
          data: cormorant,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
