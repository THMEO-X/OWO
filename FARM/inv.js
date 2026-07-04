// FARM/inv.js
const OWO_ID = "408785106942164992";
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const GEM_CODES = {
  gem1: ["057", "056", "055", "054", "053", "052", "051"],
  gem3: ["071", "070", "069", "068", "067", "066", "065"],
  gem4: ["078", "077", "076", "075", "074", "073", "072"],
};

const GEM_PREFIXES = ["cgem", "ugem", "rgem", "egem", "mgem", "lgem", "fgem"];

function hasGemInContent(content, gemNumber) {
  return GEM_PREFIXES.some((prefix) =>
    content.includes(`${prefix}${gemNumber}`)
  );
}

async function fetchAndUseGems(client, channel, global, missingGems, invMsgId) {
  const invReply = await waitForInvReply(client, channel, invMsgId);

  if (!invReply) {
    console.log("❌ Không lấy được inventory — resume farm");
    global.paused = false;
    global.gemChecking = false;
    return;
  }

  const values = [];
  const regex = /`([^`]+)`/g;
  let match;
  while ((match = regex.exec(invReply.content)) !== null) {
    values.push(match[1]);
  }

  console.log(`📦 Inventory: ${values.join(", ")}`);

  let gemsToUse = "";
  for (const gemName of missingGems) {
    const codes = GEM_CODES[gemName];
    for (const code of codes) {
      if (values.includes(code)) {
        gemsToUse += `${code} `;
        console.log(`💎 ${gemName} → code ${code}`);
        break;
      }
    }
  }

  if (!gemsToUse.trim()) {
    console.log("❌ Không có gem phù hợp trong inventory — farm tiếp");
    global.paused = false;
    global.gemChecking = false;
    return;
  }

  await delay(1000);
  await channel.send(`owo use ${gemsToUse.trim()}`);
  console.log(`✅ Đã dùng: ${gemsToUse.trim()}`);

  await delay(2000);
  global.paused = false;
  global.gemChecking = false;
  console.log("▶️ Gem xong — farm tiếp");
}

module.exports = function startGemWatcher(client, channel, global) {
  console.log("💎 Gem watcher đang chạy...");

  client.on("messageCreate", async (message) => {
    if (message.author.id !== OWO_ID) return;
    if (message.channel.id !== channel.id) return;
    if (global.gemChecking) return;

    const content = message.content;

    // ─── NHÁNH 1: "and caught an" — bỏ qua check gem, vào inv thẳng ───
    if (content.includes("and caught an")) {
      global.gemChecking = true;
      global.paused = true;
      console.log("🎯 Caught an — lấy inv thẳng, dùng tất cả gem thiếu");

      await delay(1000);
      const invMsg = await channel.send("owo inv");
      // Dùng tất cả 3 gem slot vì không check cái nào đang active
      await fetchAndUseGems(client, channel, global, ["gem1", "gem3", "gem4"], invMsg.id);
      return;
    }

    // ─── NHÁNH 2: "hunt is empowered by" — check gem bình thường ───
    if (!content.includes("hunt is empowered by")) return;

    const hasGem1 = hasGemInContent(content, "1");
    const hasGem3 = hasGemInContent(content, "3");
    const hasGem4 = hasGemInContent(content, "4");

    const missingGems = [];
    if (!hasGem1) missingGems.push("gem1");
    if (!hasGem3) missingGems.push("gem3");
    if (!hasGem4) missingGems.push("gem4");

    console.log(
      `💎 Có: ${[hasGem1 && "gem1", hasGem3 && "gem3", hasGem4 && "gem4"]
        .filter(Boolean)
        .join(", ") || "không có"}`
    );

    if (missingGems.length === 0) {
      console.log("💎 Đủ gem — farm tiếp");
      return;
    }

    global.gemChecking = true;
    global.paused = true;
    console.log(`💎 Thiếu: ${missingGems.join(", ")} — lấy inv`);

    await delay(1000);
    const invMsg = await channel.send("owo inv");
    await fetchAndUseGems(client, channel, global, missingGems, invMsg.id);
  });
};

function waitForInvReply(client, channel, invMsgId) {
  return new Promise((resolve) => {
    let done = false;

    const listener = (msg) => {
      if (
        msg.author.id === OWO_ID &&
        msg.channel.id === channel.id &&
        msg.id > invMsgId &&
        msg.content.includes("Inventory =")
      ) {
        if (!done) {
          done = true;
          client.off("messageCreate", listener);
          resolve(msg);
        }
      }
    };

    client.on("messageCreate", listener);

    setTimeout(() => {
      if (!done) {
        done = true;
        client.off("messageCreate", listener);
        resolve(null);
      }
    }, 8000);
  });
}