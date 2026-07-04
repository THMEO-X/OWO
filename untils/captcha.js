// captcha.js
const OWO_ID = "408785106942164992";

const CAPTCHA_TEXTS = [
  "please click on the character that represents a quantity or can be used for counting",
  "please click, hold, and drag the shape to complete the pattern",
  "please click, hold, and drag one of the elements on the right to complete the pairs",
  "please click on the shape that breaks the pattern",
  "please click on the object that is not shiny",
  "fill the boxes with the required number of objects indicated",
  "drag each missing peach",
  "click, hold and drag",
  "click, hold, and drag",
  "click on the shape that breaks the pattern",
];

module.exports = function startCaptchaDetector(client, channelId, idUser) {
  console.log("👁️ Captcha detector đang chạy...");

  // ─── STATE ĐỘC LẬP — không share với bất kỳ client nào khác ──────────
  const global = { captcha: false, paused: false };

  let scanCount = 0;
  let lastLog = "";

  // ─── PATCH CHANNEL.SEND ───────────────────────────────
  function patchChannel(channel) {
    if (!channel || channel.__patched) return;
    const originalSend = channel.send.bind(channel);
    channel.send = async function (...args) {
      if (global.captcha || global.paused) {
        console.log("🚫 Blocked — captcha/paused active, không gửi tin nhắn");
        return null;
      }
      return originalSend(...args);
    };
    channel.__patched = true;
  }

  client.on("channelCreate", patchChannel);
  client.channels.cache.forEach(patchChannel);

  // ─── BATCH LOG MỖI 1 GIÂY ────────────────────────────
  setInterval(() => {
    if (lastLog) {
      console.log(`[${scanCount} lần quét] ${lastLog}`);
      lastLog = "";
    }
    scanCount = 0;
  }, 1000);

  // ─── 1. CHANNEL-SPECIFIC SCANNER — CHỈ OwO TRONG CHANNEL NÀY ──
  client.on("messageCreate", (message) => {
    if (message.author.id !== OWO_ID) return;
    if (message.channel.id !== channelId) return;
    if (global.captcha) return;

    const content = message.content.toLowerCase();
    const hasCaptchaText = CAPTCHA_TEXTS.some((text) =>
      content.includes(text.toLowerCase())
    );
    const hasCaptchaUrl =
      message.embeds?.some(
        (embed) =>
          embed.url?.includes("owobot.com/captcha") ||
          embed.description?.includes("owobot.com/captcha") ||
          embed.fields?.some((f) => f.value?.includes("owobot.com/captcha"))
      );
    const hasCaptchaButton = message.components?.some((row) =>
      row.components?.some(
        (btn) =>
          btn.url?.includes("owobot.com/captcha") ||
          btn.label?.toLowerCase().includes("captcha")
      )
    );

    if (hasCaptchaText || hasCaptchaUrl || hasCaptchaButton) {
      global.captcha = true;
      global.paused = true;
      client.channels.cache.forEach(patchChannel);
      lastLog = `⚠️ [CHANNEL SCAN] CAPTCHA DETECTED — HARD LOCK | "${message.content.slice(0, 80)}"`;
    }
  });

  // ─── LISTENER — QUÉT 10 LẦN × 0.1S ──────────────────
  client.on("messageCreate", (message) => {
    const isOwo = message.author.id === OWO_ID;
    const isUser = message.author.id === client.user.id;

    if (!isOwo && !isUser) return;
    if (global.captcha) return;

    let count = 0;
    const interval = setInterval(() => {
      count++;
      scanCount++;

      const content = message.content.toLowerCase();

      const hasCaptchaText = CAPTCHA_TEXTS.some((text) =>
        content.includes(text.toLowerCase())
      );

      const hasCaptchaUrl = message.embeds?.some(
        (embed) =>
          embed.url?.includes("owobot.com/captcha") ||
          embed.description?.includes("owobot.com/captcha") ||
          embed.fields?.some((f) => f.value?.includes("owobot.com/captcha"))
      );

      const hasCaptchaButton = message.components?.some((row) =>
        row.components?.some(
          (btn) =>
            btn.url?.includes("owobot.com/captcha") ||
            btn.label?.toLowerCase().includes("captcha")
        )
      );

      if (hasCaptchaText || hasCaptchaUrl || hasCaptchaButton) {
        global.captcha = true;
        global.paused = true;
        client.channels.cache.forEach(patchChannel);
        lastLog = `⚠️ CAPTCHA DETECTED — HARD LOCK | Từ: ${isOwo ? "OwO Bot" : "User"} | "${message.content.slice(0, 80)}"`;
        clearInterval(interval);
        return;
      }

      if (count >= 10) clearInterval(interval);
    }, 100);
  });

  // ─── TT — CHỈ NHẬN TỪ ID_USER CỦA PROFILE NÀY ────────────────────────
  // Oka's ID_USER chỉ resume Oka. Rei's ID_USER chỉ resume Rei.
  // Không cross, không share.
  client.on("messageCreate", (message) => {
    if (message.author.id !== idUser) return; // sai người → bỏ qua hoàn toàn
    if (message.content !== "TT") return;

    global.captcha = false;
    global.paused = false;
    console.log(`▶️ TT từ ID_USER ${idUser} — Captcha cleared, farm tiếp tục`);
  });

  return global;
};