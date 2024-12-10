const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "จับคู่",
    description: "สุ่มจับคู่สมาชิกในกลุ่มกับคุณ พร้อมแสดงเปอร์เซ็นต์ความเข้ากัน",
    usage: "/จับคู่",
    permissions: [],
    aliases: ["match"],
  },

  run: async ({ api, event, args }) => {
    try {
      const threadID = event.threadID;
      const senderID = event.senderID;

      // ดึงข้อมูลผู้เข้าร่วมในกลุ่ม
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = threadInfo.participantIDs;

      // กำจัดตัวเองและบอทออกจากรายชื่อ
      const filteredParticipants = participants.filter(id => id !== senderID && id !== api.getCurrentUserID());

      if (filteredParticipants.length === 0) {
        return api.sendMessage("❗ ไม่มีสมาชิกในกลุ่มที่สามารถจับคู่ได้ในขณะนี้.", threadID);
      }

      // สุ่มเลือกผู้ใช้หนึ่งคน
      const randomIndex = Math.floor(Math.random() * filteredParticipants.length);
      const matchedUserID = filteredParticipants[randomIndex];

      // ดึงข้อมูลผู้ใช้
      const matchedUserInfo = await api.getUserInfo(matchedUserID);
      const senderInfo = await api.getUserInfo(senderID);

      const matchedUserName = matchedUserInfo[matchedUserID].name;
      const senderName = senderInfo[senderID].name;

      // ฟังก์ชันสร้างลิงก์รูปโปรไฟล์ (ขนาดใหญ่)
      const getProfilePicURL = (userID) => {
        return `https://graph.facebook.com/${userID}/picture?type=large`;
      };

      const senderPhotoURL = getProfilePicURL(senderID);
      const matchedUserPhotoURL = getProfilePicURL(matchedUserID);

      // ฟังก์ชันดาวน์โหลดรูปภาพ
      const downloadImage = async (url, filePath) => {
        const response = await axios({
          url,
          method: 'GET',
          responseType: 'stream',
        });
        return new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      };

      // สร้างโฟลเดอร์ชั่วคราวสำหรับเก็บไฟล์
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // ดาวน์โหลดรูปภาพ
      const senderPhotoPath = path.join(tempDir, `${senderID}.jpg`);
      const matchedUserPhotoPath = path.join(tempDir, `${matchedUserID}.jpg`);

      await downloadImage(senderPhotoURL, senderPhotoPath);
      await downloadImage(matchedUserPhotoURL, matchedUserPhotoPath);

      // สุ่มเปอร์เซ็นต์ความเข้ากัน
      const compatibility = Math.floor(Math.random() * 51) + 50; // 50 - 100
      const compatibilityDescription = compatibility >= 90 ? "ยอดเยี่ยม! 💖" :
        compatibility >= 75 ? "ดีมาก! 😊" :
          compatibility >= 60 ? "ดี! 🙂" : "พอใช้! 😅";

      // สร้างข้อความตอบกลับ
      const message = `
💑 **การจับคู่สำเร็จ!**

👤 **คุณ:** ${senderName}

👤 **คู่ของคุณ:** ${matchedUserName}

❤️ **ความเข้ากัน:** ${compatibility}% ${compatibilityDescription}
      `;

      // ส่งข้อความพร้อมรูปภาพ
      const attachments = [
        fs.createReadStream(senderPhotoPath),
        fs.createReadStream(matchedUserPhotoPath),
      ];

      await api.sendMessage({ body: message, attachment: attachments }, threadID);

      // ลบไฟล์ชั่วคราว
      fs.unlinkSync(senderPhotoPath);
      fs.unlinkSync(matchedUserPhotoPath);

    } catch (error) {
      console.error(chalk.red("❌ เกิดข้อผิดพลาดในคำสั่งจับคู่:"), error);
      return api.sendMessage("❗ เกิดข้อผิดพลาดในการทำงานของคำสั่งจับคู่.", event.threadID);
    }
  }
};
