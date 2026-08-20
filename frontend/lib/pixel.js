/**
 * The pixel office: a tiny software renderer.
 *
 * Everything is drawn as filled rectangles into a small logical canvas
 * (576x352) which is then scaled up with `image-rendering: pixelated`. That is
 * what makes it look like a sprite game rather than smooth vector art — there
 * are no images, no sprite sheets and no game engine here, just rects.
 *
 * Layout is a 4x3 grid of desk pods, one per agent on the roster.
 */
import { STAFF } from "./roster";
import { STATUS, BUSY } from "./theme";

export const LOGICAL_W = 576;
export const LOGICAL_H = 376;

const ORIGIN_X = 32, ORIGIN_Y = 62;
const CELL_W = 128, CELL_H = 92;
/*  A gap between rows: the zone label and the speech bubbles live in it, so
    neither can land on the name plate of the row above.                    */
const GUTTER = 14;
const COLS = 4;

/** Muted 90s-office palette. Deliberately not the app's navy — the canvas is
 *  meant to read as a screen inside the product. */
const P = {
  floorA: "#3E5148", floorB: "#3A4C43", floorLine: "#34443C",
  wall: "#6F8175", wallDark: "#4C5C53", wallTop: "#87998B",
  desk: "#A87C46", deskDark: "#7C5A31", deskEdge: "#654A28",
  monitor: "#232F3B", monitorDark: "#18222C", monitorFoot: "#1C2733",
  chair: "#2F3A45", chairDark: "#232C35",
  skin: "#E8B489", skinDark: "#C98D63",
  plantPot: "#8A5A3A", plantA: "#3F7A46", plantB: "#4F9155",
  paper: "#D8D5C8", mug: "#C05B4A", board: "#D8D5C8", boardFrame: "#7C5A31",
  ink: "#0E1A16", shadow: "rgba(0,0,0,0.25)",
};

/** Per-agent shirt colours, so desks are tellable apart at a glance. */
const SHIRTS = ["#C4574D", "#4E7FC4", "#C9944A", "#5FA86A", "#8E6BC4", "#4AA3A8",
                "#C46B9E", "#7A8CA8", "#B5844A", "#5E8F5E", "#A85F4A", "#6B7FC4"];
const HAIRS = ["#2B2B33", "#4A3122", "#1F1F26", "#6B4A2A", "#2B2B33", "#3A2418",
               "#503018", "#2B2B33", "#5A3A22", "#1F1F26", "#3A2A1A", "#2B2B33"];

/* ------------------------------------------------------------- 3x5 font -- */
/* Uppercase only. Small enough that anything else would be unreadable at 1x. */
const GLYPHS = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011",
  D: "110101101101110", E: "111100110100111", F: "111100110100100",
  G: "011100101101011", H: "101101111101101", I: "111010010010111",
  J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101011",
  V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
  0: "111101101101111", 1: "010110010010111", 2: "110001010100111",
  3: "111001011001111", 4: "101101111001001", 5: "111100110001110",
  6: "011100110101010", 7: "111001010010010", 8: "010101010101010",
  9: "010101011001110",
  ".": "000000000000010", "-": "000000111000000", "!": "010010010000010",
  "?": "110001010000010", "/": "001001010100100", ":": "000010000010000",
  "%": "101001010100101", "+": "000010111010000", " ": "000000000000000",
};

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };

/** Draw a string in the 3x5 font. Returns the width drawn. */
export function text(ctx, str, x, y, color, spacing = 1) {
  let cx = x;
  for (const raw of String(str).toUpperCase()) {
    const g = GLYPHS[raw] ?? GLYPHS[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (g[row * 3 + col] === "1") px(ctx, cx + col, y + row, 1, 1, color);
      }
    }
    cx += 3 + spacing;
  }
  return cx - x;
}
export const textWidth = (str, spacing = 1) => String(str).length * (3 + spacing) - spacing;

/* ---------------------------------------------------------------- layout -- */

export const cellOf = (index) => ({
  x: ORIGIN_X + (index % COLS) * CELL_W,
  y: ORIGIN_Y + Math.floor(index / COLS) * (CELL_H + GUTTER),
});

/** Which desk is under a logical-pixel point, if any. */
export function hitTest(lx, ly) {
  for (let i = 0; i < STAFF.length; i++) {
    const { x, y } = cellOf(i);
    if (lx >= x && lx < x + CELL_W && ly >= y && ly < y + CELL_H) return STAFF[i].id;
  }
  return null;
}

/* -------------------------------------------------------------- sprites -- */

/** A seated worker: head, hair and shoulders. The desk covers the rest. */
function worker(ctx, x, y, i, status, frame) {
  const bob = status === "working" ? (frame % 2) : 0;   // typing bounce
  const blink = status !== "working" && (frame + i * 3) % 11 === 0;
  const shirt = SHIRTS[i % SHIRTS.length];
  const hair = HAIRS[i % HAIRS.length];
  const top = y + 15 + bob;

  px(ctx, x + 56, top + 10, 16, 16, shirt);              // torso
  px(ctx, x + 54, top + 13, 2, 10, shirt);               // arms
  px(ctx, x + 72, top + 13, 2, 10, shirt);
  px(ctx, x + 56, top + 10, 16, 2, "rgba(255,255,255,0.10)");

  px(ctx, x + 59, top, 10, 10, P.skin);                  // head
  px(ctx, x + 59, top + 8, 10, 2, P.skinDark);           // jaw shade
  px(ctx, x + 58, top - 2, 12, 5, hair);                 // hair
  px(ctx, x + 57, top + 1, 2, 5, hair);
  px(ctx, x + 69, top + 1, 2, 5, hair);
  if (blink) {
    px(ctx, x + 61, top + 5, 2, 1, P.ink);               // eyes, shut
    px(ctx, x + 65, top + 5, 2, 1, P.ink);
  } else {
    px(ctx, x + 61, top + 4, 2, 2, P.ink);               // eyes
    px(ctx, x + 65, top + 4, 2, 2, P.ink);
  }
}

function desk(ctx, x, y, status, frame) {
  const s = (STATUS[status] ?? STATUS.offline).c;
  const on = BUSY.includes(status);

  px(ctx, x + 50, y + 38, 28, 20, P.monitorDark);        // monitor body
  px(ctx, x + 51, y + 39, 26, 16, P.monitor);
  const glow = on ? s : "#1A2430";
  px(ctx, x + 52, y + 40, 24, 14, glow);                 // screen
  if (on) {
    px(ctx, x + 52, y + 40, 24, 14, "rgba(0,0,0,0.35)");
    for (let r = 0; r < 4; r++) {                        // scrolling code lines
      const w = 4 + ((frame + r * 3 + x) % 5) * 4;
      px(ctx, x + 54, y + 42 + r * 3, w, 1, s);
    }
  }
  px(ctx, x + 62, y + 58, 4, 3, P.monitorFoot);          // stand

  px(ctx, x + 16, y + 61, 96, 12, P.desk);               // desk surface
  px(ctx, x + 16, y + 61, 96, 2, "rgba(255,255,255,0.12)");
  px(ctx, x + 16, y + 73, 96, 4, P.deskEdge);            // front edge
  px(ctx, x + 46, y + 63, 32, 5, P.deskDark);            // keyboard
  for (let k = 0; k < 7; k++) px(ctx, x + 48 + k * 4, y + 64, 2, 1, "#9A8A72");
  px(ctx, x + 84, y + 62, 5, 6, P.mug);                  // mug
  px(ctx, x + 24, y + 63, 12, 5, P.paper);               // papers
  px(ctx, x + 25, y + 65, 10, 1, "#B9B5A4");

  px(ctx, x + 56, y + 78, 18, 8, P.chair);               // chair back
  px(ctx, x + 56, y + 78, 18, 2, P.chairDark);
}

function plant(ctx, x, y) {
  px(ctx, x + 3, y + 8, 8, 7, P.plantPot);
  px(ctx, x + 3, y + 8, 8, 2, "#9E6B45");
  px(ctx, x + 5, y + 1, 4, 8, P.plantA);
  px(ctx, x + 1, y + 3, 4, 4, P.plantB);
  px(ctx, x + 9, y + 2, 4, 5, P.plantB);
}

/** Speech bubble with a 3x5 label. Kept short on purpose. */
function bubble(ctx, x, y, label, color) {
  const w = textWidth(label) + 8;
  const bx = x + 64 - (w >> 1);
  px(ctx, bx, y, w, 11, "#EDEAE0");
  px(ctx, bx + 1, y - 1, w - 2, 1, "#EDEAE0");
  px(ctx, bx + 1, y + 11, w - 2, 1, "#EDEAE0");
  px(ctx, x + 62, y + 12, 3, 2, "#EDEAE0");              // tail
  px(ctx, bx, y, w, 1, "rgba(0,0,0,0.15)");
  text(ctx, label, bx + 4, y + 3, color);
}

/** The short word that goes in the bubble — never model prose. */
function labelFor(status, state) {
  if (status === "error") return "TESTS RED";
  if (status === "blocked") return "BLOCKED";
  if (status === "thinking") return "PLANNING";
  if (status === "reviewing") return "REVIEWING";
  if (status === "waiting") return "IDLE";
  if (status === "offline") return "EMPTY DESK";
  if (state?.testsTotal && state.testsPassed === state.testsTotal) return "TESTS OK";
  return "WORKING";
}

/* ----------------------------------------------------------------- scene -- */

function floor(ctx) {
  px(ctx, 0, 0, LOGICAL_W, LOGICAL_H, P.floorA);
  for (let y = 0; y < LOGICAL_H; y += 16) {
    for (let x = 0; x < LOGICAL_W; x += 16) {
      if (((x / 16) + (y / 16)) % 2 === 0) px(ctx, x, y, 16, 16, P.floorB);
    }
  }
  for (let x = 0; x < LOGICAL_W; x += 16) px(ctx, x, 0, 1, LOGICAL_H, P.floorLine);
  for (let y = 0; y < LOGICAL_H; y += 16) px(ctx, 0, y, LOGICAL_W, 1, P.floorLine);

  px(ctx, 0, 0, LOGICAL_W, 10, P.wallDark);              // back wall
  px(ctx, 0, 0, LOGICAL_W, 6, P.wall);
  px(ctx, 0, 0, LOGICAL_W, 2, P.wallTop);
  px(ctx, 0, 0, 8, LOGICAL_H, P.wallDark);
  px(ctx, LOGICAL_W - 8, 0, 8, LOGICAL_H, P.wallDark);
  px(ctx, 0, LOGICAL_H - 6, LOGICAL_W, 6, P.wallDark);
}

function lobby(ctx, frame) {
  px(ctx, 40, 16, 96, 6, P.boardFrame);                  // whiteboard
  px(ctx, 42, 17, 92, 4, P.board);
  for (let i = 0; i < 5; i++) px(ctx, 46 + i * 17, 18, 8 + (i % 3) * 3, 1, "#6E8AA8");

  px(ctx, 200, 14, 80, 22, P.desk);                      // meeting table
  px(ctx, 200, 14, 80, 3, "rgba(255,255,255,0.12)");
  px(ctx, 200, 36, 80, 3, P.deskEdge);
  px(ctx, 214, 8, 12, 6, P.chair);
  px(ctx, 254, 8, 12, 6, P.chair);
  px(ctx, 214, 39, 12, 6, P.chair);
  px(ctx, 254, 39, 12, 6, P.chair);

  px(ctx, 330, 12, 14, 26, "#8F9AA5");                   // water cooler
  px(ctx, 332, 8, 10, 8, "#7FB6D9");
  px(ctx, 333, 22 + (frame % 2), 2, 3, "#7FB6D9");

  px(ctx, 380, 14, 22, 20, P.monitorDark);               // printer
  px(ctx, 382, 16, 18, 8, "#4A5A66");
  px(ctx, 384, 30, 14, 6, P.paper);

  plant(ctx, 430, 18);
  plant(ctx, 470, 18);
  px(ctx, 500, 14, 40, 24, P.deskDark);                  // shelf
  for (let i = 0; i < 6; i++) px(ctx, 503 + i * 6, 17, 4, 8, SHIRTS[i]);
}

const ZONES = ["MANAGEMENT + PRODUCT", "ENGINEERING", "QUALITY + INFRASTRUCTURE"];

export function drawScene(ctx, { agents, selected, hovered, talking, frame }) {
  const speaking = talking instanceof Set ? talking : new Set(talking || []);
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  floor(ctx);
  lobby(ctx, frame);

  for (let row = 0; row < 3; row++) {
    const y = ORIGIN_Y + row * (CELL_H + GUTTER);
    text(ctx, ZONES[row], ORIGIN_X + 2, y - 11, "#7B8F81");
    px(ctx, ORIGIN_X, y - 4, COLS * CELL_W, 1, P.floorLine);
  }

  STAFF.forEach((person, i) => {
    const { x, y } = cellOf(i);
    const state = agents[person.id] ?? { status: "offline" };
    const status = state.status ?? "offline";
    const s = (STATUS[status] ?? STATUS.offline).c;
    const isSel = person.id === selected;

    if (i % COLS !== 0) px(ctx, x, y + 6, 2, CELL_H - 12, P.wallDark);   // partitions
    px(ctx, x + 4, y + CELL_H - 4, CELL_W - 8, 2, P.wallDark);

    if (isSel) {
      px(ctx, x + 4, y + 6, CELL_W - 8, CELL_H - 12, "rgba(99,102,241,0.16)");
      const d = frame % 2;
      px(ctx, x + 4 + d, y + 6, CELL_W - 8 - d * 2, 1, "#8B8DF5");
      px(ctx, x + 4 + d, y + CELL_H - 7, CELL_W - 8 - d * 2, 1, "#8B8DF5");
    } else if (person.id === hovered) {
      px(ctx, x + 4, y + 6, CELL_W - 8, CELL_H - 12, "rgba(255,255,255,0.05)");
    }

    const staffed = status !== "offline";
    px(ctx, x + 30, y + 84, 68, 4, P.shadow);            // desk shadow
    if (staffed) worker(ctx, x, y, i, status, frame);
    desk(ctx, x, y, status, frame);
    if (!staffed) {
      px(ctx, x + 4, y + 6, CELL_W - 8, CELL_H - 12, "rgba(10,16,14,0.30)");
      text(ctx, "VACANT", x + 64 - (textWidth("VACANT") >> 1), y + 28, "#55665C");
    }
    if (i % COLS === COLS - 1) plant(ctx, x + CELL_W - 22, y + 58);

    const dot = BUSY.includes(status) && frame % 2 ? 2 : 1;   // status pip
    px(ctx, x + 62, y + 8, 4, 4, s);
    px(ctx, x + 62 - dot, y + 8 - dot, 4 + dot * 2, 4 + dot * 2, `${s}55`);

    /*  Not everyone talks at once — that reads as noise. Bubbles go to the
        desk you selected, anything that needs a human, and whoever just did
        something.                                                          */
    const needsYou = status === "error" || status === "blocked";
    if (isSel || needsYou || speaking.has(person.id)) {
      bubble(ctx, x, y - 9, labelFor(status, state), needsYou ? "#B23A32" : "#1F2A25");
    }

    text(ctx, person.name, x + 64 - (textWidth(person.name) >> 1), y + CELL_H - 14,
         staffed ? "#C9D6CB" : "#6B7C71");
  });
}

/** The same worker sprite, used for the roster strip under the office. */
export function drawAvatar(ctx, index, status, frame = 0) {
  const shirt = SHIRTS[index % SHIRTS.length];
  const hair = HAIRS[index % HAIRS.length];
  const s = (STATUS[status] ?? STATUS.offline).c;
  ctx.clearRect(0, 0, 20, 20);
  px(ctx, 0, 0, 20, 20, "#2A3A32");
  px(ctx, 0, 0, 20, 1, "#3A4C43");
  const bob = status === "working" ? (frame % 2) : 0;
  px(ctx, 5, 11 + bob, 10, 9, shirt);
  px(ctx, 3, 13 + bob, 2, 6, shirt);
  px(ctx, 15, 13 + bob, 2, 6, shirt);
  px(ctx, 6, 3 + bob, 8, 8, P.skin);
  px(ctx, 5, 1 + bob, 10, 4, hair);
  px(ctx, 4, 3 + bob, 2, 4, hair);
  px(ctx, 14, 3 + bob, 2, 4, hair);
  px(ctx, 8, 6 + bob, 1, 2, P.ink);
  px(ctx, 11, 6 + bob, 1, 2, P.ink);
  px(ctx, 16, 1, 3, 3, s);
}
