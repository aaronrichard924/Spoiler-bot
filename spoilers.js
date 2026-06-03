const fs = require("fs");

const SEEN_FILE = "seen.json";

async function getLatestCards() {
  const res = await fetch("https://api.scryfall.com/cards/search?q=set:one OR set:otj OR set:blb&order=spoiled&dir=desc");
  const data = await res.json();
  return data.data || [];
}

function loadSeen() {
  if (!fs.existsSync(SEEN_FILE)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(SEEN_FILE)));
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

  for (const card of cards) {
    if (!seen.has(card.id)) {
      console.log("New card:", card.name);

      await postToDiscord(card);
      seen.add(card.id);
    }
  }

  saveSeen(seen);
}

run();
