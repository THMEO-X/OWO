const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");
const PROFILES_DIR = path.join(__dirname, "..", "..", "profiles");

module.exports = function sever(app) {

  app.post("/api/sync", async (req, res) => {
    try {
      const { token1, idtoken, idchannel, invisible } = req.body;

      if (!token1 || !token1.trim()) {
        return res.status(400).json({
          ok: false,
          message: "Thiếu token1 — cần token Discord để lấy tên người dùng"
        });
      }

      // Lấy username thật từ Discord API (user token — không prefix Bot)
      let discordName;
      try {
        const discordRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: {
            Authorization: token1.trim()
          }
        });

        if (!discordRes.ok) {
          const errBody = await discordRes.json().catch(() => ({}));
          return res.status(401).json({
            ok: false,
            message: `Discord từ chối token: ${errBody.message || discordRes.status}`
          });
        }

        const discordUser = await discordRes.json();
        discordName = discordUser.global_name || discordUser.username;

      } catch (fetchErr) {
        return res.status(502).json({
          ok: false,
          message: `Không kết nối được Discord API: ${fetchErr.message}`
        });
      }

      // Sanitize tên folder
      const safeName = discordName
        .trim()
        .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, "")
        .trim()
        .replace(/\s+/g, "_");

      if (!safeName) {
        return res.status(400).json({
          ok: false,
          message: `Tên Discord "${discordName}" không hợp lệ sau khi sanitize`
        });
      }

      // Tạo folder profile nếu chưa có
      const profileDir = path.join(PROFILES_DIR, safeName);
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
        console.log(`📁 Tạo folder profile mới: profiles/${safeName}`);
      }

      // Lưu data.json
      const data = {
        token1: token1 || "",
        idtoken: idtoken || "",
        idchannel: idchannel || "",
        invisible: invisible || false,
        displayName: safeName,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

      // Ghi .env vào folder profile
      const envContent =
`TOKEN=${token1 || ""}
ID_USER=${idtoken || ""}
CHANNEL=${idchannel || ""}
INV=${invisible || false}
`;

      const profileEnvPath = path.join(profileDir, ".env");
      fs.writeFileSync(profileEnvPath, envContent);

      console.log("\n✅ Đã đồng bộ thành công!");
      console.log(`👤 Discord name: ${discordName} → folder: ${safeName}`);
      console.log(`📄 data.json đã cập nhật`);
      console.log(`🔐 .env đã ghi vào: profiles/${safeName}/.env`);

      res.json({
        ok: true,
        message: "Đồng bộ thành công",
        profile: safeName,
        discordName,
        envPath: `profiles/${safeName}/.env`
      });

    } catch (err) {
      console.error("❌ Lỗi sync:", err);
      res.status(500).json({
        ok: false,
        message: err.message
      });
    }
  });

  // Liệt kê tất cả profiles
  app.get("/api/profiles", (req, res) => {
    try {
      if (!fs.existsSync(PROFILES_DIR)) {
        return res.json({ ok: true, profiles: [] });
      }

      const profiles = fs.readdirSync(PROFILES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => {
          const envPath = path.join(PROFILES_DIR, d.name, ".env");
          return {
            name: d.name,
            hasEnv: fs.existsSync(envPath)
          };
        });

      res.json({ ok: true, profiles });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  });

};