onStart: async function ({ api, event }) {
    const axios = require("axios");
    const fs = require("fs-extra");
    const ytdl = require("@distube/ytdl-core");
    const yts = require("yt-search");
    const path = require("path");

    const input = event.body || "";
    const song = input.substring(6).trim(); // Assume command is "/เพลง <ชื่อเพลง>"

    if (!song) {
      return api.sendMessage("❗ กรุณาใส่ชื่อเพลงที่ต้องการค้นหา!", event.threadID);
    }

    try {
      const sendMsg = await api.sendMessage(`⌛ กำลังค้นหาเพลง 🔎 "${song}"`, event.threadID);

      // ค้นหาเพลงบน YouTube
      const searchResults = await yts(song);
      if (!searchResults.videos || !searchResults.videos.length) {
        return api.sendMessage("❗ ไม่พบเพลงที่คุณต้องการค้นหา", event.threadID, event.messageID);
      }

      const video = searchResults.videos[0];
      const videoUrl = video.url;
      const videoTitle = video.title;
      const videoAuthor = video.author.name;

      // ดาวน์โหลดเพลง
      const stream = ytdl(videoUrl, { filter: "audioonly" });
      const tempDir = path.join(__dirname, "cache");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const filePath = path.join(tempDir, `music-${Date.now()}.mp3`);
      const writeStream = fs.createWriteStream(filePath);

      stream.pipe(writeStream);

      stream.on("response", () => {
        console.info("[DOWNLOADER]", `เริ่มดาวน์โหลดเพลง: ${videoTitle}`);
      });

      stream.on("end", async () => {
        console.info("[DOWNLOADER] ดาวน์โหลดเสร็จสิ้น");

        // ลบข้อความ "กำลังค้นหาเพลง"
        await api.unsendMessage(sendMsg.messageID);

        // ตรวจสอบขนาดไฟล์
        if (fs.statSync(filePath).size > 26214400) { // 25MB
          fs.unlinkSync(filePath);
          return api.sendMessage("❗ ไฟล์มีขนาดใหญ่เกิน 25MB ไม่สามารถส่งได้", event.threadID);
        }

        // ส่งเพลง
        const message = {
          body: `🎵 **ชื่อเพลง**: ${videoTitle}\n🎤 **ศิลปิน**: ${videoAuthor}`,
          attachment: fs.createReadStream(filePath),
        };

        api.sendMessage(message, event.threadID, () => {
          // ลบไฟล์หลังส่งเสร็จ
          fs.unlinkSync(filePath);
        });
      });

      stream.on("error", (error) => {
        console.error("[ERROR]", error);
        api.sendMessage("❗ เกิดข้อผิดพลาดในการดาวน์โหลดเพลง", event.threadID);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error("[ERROR]", error);
      api.sendMessage("❗ เกิดข้อผิดพลาดระหว่างประมวลผลคำสั่ง", event.threadID);
    }
  }
};
