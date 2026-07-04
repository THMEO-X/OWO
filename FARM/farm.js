const fs = require('fs');
const startGemWatcher = require('./inv');
const pauseCmd = require('../Commands/pause');
const resumeCmd = require('../Commands/resume');
const startStatsCommand = require('../untils/webhock');
const startRPC = require('../untils/rpc');
const path = require('path');

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min) + min);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const stats = { hunt: 0, battle: 0 };

const global = {
  paused: false,
  captcha: false,
  gemChecking: false,
};

// ─── AUTO PAUSE CYCLE ─────────────────────────────────────
function startAutoPause() {
  const runTime = randomDelay(15 * 60 * 1000, 30 * 60 * 1000);
  const pauseTime = randomDelay(5 * 60 * 1000, 7 * 60 * 1000);

  console.log(`⏱️ Sẽ pause sau ${(runTime / 60000).toFixed(1)} phút`);

  setTimeout(() => {
    global.paused = true;
    console.log(`⏸️ Auto pause — nghỉ ${(pauseTime / 60000).toFixed(1)} phút`);

    setTimeout(() => {
      if (!global.captcha && !global.gemChecking) {
        global.paused = false;
        console.log("▶️ Auto resume — farm tiếp");
      } else {
        console.log("⚠️ Auto resume bị hold — captcha/gem đang active");
      }
      startAutoPause();
    }, pauseTime);
  }, runTime);
}

// ─── FARM ─────────────────────────────────────────────────
module.exports = async function farm(client, channelId) {
  if (!channelId) {
    console.log("❌ Không có CHANNEL — kiểm tra lại");
    return;
  }

  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.log(`❌ Không tìm thấy kênh ID: ${channelId}`);
    return;
  }

  console.log(`✅ Farm bắt đầu tại kênh: ${channel.name}`);

  startGemWatcher(client, channel, global);
  startAutoPause();
  startStatsCommand(client, stats);
  startRPC(client);

  client.on('messageCreate', async (message) => {
    await pauseCmd(client, message, global);
    await resumeCmd(client, message, global);
  });

  hunt(client, channel);
  await delay(2000);
  battle(client, channel);
};

// ─── HUNT ────────────────────────────────────────────────
async function hunt(client, channel) {
  while (global.paused || global.captcha) {
    console.log("⏳ Đang chờ — pause/captcha...");
    await delay(16000);
  }

  try {
    channel.sendTyping();
    await delay(randomDelay(500, 1500));

    await channel.send(
      `${randomChoice(["owo", "owo"])} ${randomChoice(["h", "hunt"])}`
    );

    stats.hunt++;
    console.log(`🏹 Hunt #${stats.hunt}`);

    await delay(randomDelay(2000, 4000));
    await sendPhrase(channel);

  } catch (err) {
    console.log("❌ Lỗi hunt:", err.message);
  } finally {
    const next = randomDelay(15000, 25000);
    console.log(`⏱️ Hunt tiếp theo sau ${(next / 1000).toFixed(1)}s`);
    setTimeout(() => hunt(client, channel), next);
  }
}

// ─── BATTLE ──────────────────────────────────────────────
async function battle(client, channel) {
  while (global.paused || global.captcha) {
    console.log("⏳ Đang chờ — pause/captcha...");
    await delay(16000);
  }

  try {
    channel.sendTyping();
    await delay(randomDelay(500, 1500));

    await channel.send(
      `${randomChoice(["owo", "owo"])} ${randomChoice(["b", "battle"])}`
    );

    stats.battle++;
    console.log(`⚔️ Battle #${stats.battle}`);

  } catch (err) {
    console.log("❌ Lỗi battle:", err.message);
  } finally {
    const next = randomDelay(15000, 25000);
    console.log(`⏱️ Battle tiếp theo sau ${(next / 1000).toFixed(1)}s`);
    setTimeout(() => battle(client, channel), next);
  }
}

// ─── PHRASES ─────────────────────────────────────────────
async function sendPhrase(channel) {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../textmess/text.json'), 'utf8');
    const { phrases } = JSON.parse(data);

    if (!phrases || phrases.length === 0) {
      console.log("❌ Phrases trống hoặc không có");
      return;
    }

    const phrase = randomChoice(phrases);
    channel.sendTyping();
    await delay(randomDelay(1000, 2000));
    await channel.send(phrase);
    console.log(`💬 Phrase: "${phrase}"`);

  } catch (err) {
    console.log("❌ Lỗi đọc phrases.json:", err.message);
  }
}