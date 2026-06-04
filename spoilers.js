const fs = require("fs");

const SEEN_FILE = "seen.json";

// Main spoiler feed (this is the correct source)
const SCRYFALL_URL =
  "https://api.scryfall.com/cards/search?q=is%3Aspoiler&order=spoiled&dir=desc";

async function getLatestCards() {
  const res = await fetch(SCRYFALL_URL);
  const data = await res.json();
  return data.data || [];
}

function loadSeen() {
  if (!fs.existsSync(SEEN_FILE)) return new Set();
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, "utf8")));
  } catch {
    return new Set();
  }
}

function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2));
}

async function postToDiscord(card) {
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `🃏 **New Spoiler:** ${card.name}\n${card.scryfall_uri}`
    })
  });
}

async function run() {
  const seen = loadSeen();
  const cards = await getLatestCards();

  if (!Array.isArray(cards)) {
    console.log("No cards returned from Scryfall.");
    return;
  }

  // Process oldest → newest so Discord order makes sense
  const sorted = cards.slice().reverse();

  let newCount = 0;

  for (const card of sorted) {
    if (!seen.has(card.id)) {
      console.log("New card:", card.name);

      await postToDiscord(card);
      seen.add(card.id);
      newCount++;
    }
  }

  saveSeen(seen);

  console.log(`Done. ${newCount} new cards posted.`);
}

run();
