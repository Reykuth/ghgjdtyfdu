module.exports = {
  config: {
    name: "เพลง",
    description: "ค้นหาและดาวน์โหลดเพลงจาก YouTube",
    usage: "/เพลง <ชื่อเพลง>",
    aliases: ["song", "music"],
  },

  onStart: async function ({ api, event, args }) {
    const fs = require("fs-extra");
    const ytdl = require("@distube/ytdl-core");
    const yts = require("yt-search");
    const path = require("path");

    // ตรวจสอบว่าใส่ชื่อเพลงมาหรือไม่
    const songName = args.join(" ");
    if (!songName) {
      return api.sendMessage("❗ กรุณาใส่ชื่อเพลงที่ต้องการค้นหา เช่น /เพลง รักเธอทั้งหมดของหัวใจ", event.threadID, event.messageID);
    }

    try {
      // แจ้งผู้ใช้ว่ากำลังค้นหาเพลง
      const searchingMessage = await api.sendMessage(`⌛ กำลังค้นหาเพลง 🔎 "${songName}"`, event.threadID);

      // ค้นหาเพลงบน YouTube
      const searchResults = await yts(songName);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return api.sendMessage("❗ ไม่พบเพลงที่คุณต้องการค้นหา", event.threadID, event.messageID);
      }

      const video = searchResults.videos[0]; // เลือกวิดีโอแรกในผลการค้นหา
      const videoUrl = video.url;
      const videoTitle = video.title;
      const videoAuthor = video.author.name;

      // ดาวน์โหลดเพลงจาก YouTube
      const tempDir = path.join(__dirname, "cache");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const filePath = path.join(tempDir, `music-${Date.now()}.mp3`);

      const stream = ytdl(videoUrl, { filter: "audioonly" });
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);

      stream.on("response", () => {
        console.info(`[DOWNLOADER] เริ่มดาวน์โหลดเพลง: ${videoTitle}`);
      });

      stream.on("end", async () => {
        console.info(`[DOWNLOADER] ดาวน์โหลดเสร็จสิ้น`);

        // ลบข้อความ "กำลังค้นหาเพลง"
        await api.unsendMessage(searchingMessage.messageID);

        // ตรวจสอบขนาดไฟล์ก่อนส่ง
        if (fs.statSync(filePath).size > 26214400) { // 25MB
          fs.unlinkSync(filePath);
          return api.sendMessage("❗ ไฟล์มีขนาดใหญ่เกิน 25MB ไม่สามารถส่งได้", event.threadID, event.messageID);
        }

        // ส่งเพลงให้ผู้ใช้
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
        api.sendMessage("❗ เกิดข้อผิดพลาดในการดาวน์โหลดเพลง", event.threadID, event.messageID);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error("[ERROR]", error);
      api.sendMessage("❗ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง", event.threadID, event.messageID);
    }
  },
};
