// จับคู่.js
const axios = require('axios');
const chalk = require('chalk');

module.exports = {
  config: {
    name: "จับคู่", // ชื่อคำสั่ง
    description: "สุ่มจับคู่สมาชิกในกลุ่มกับคุณ พร้อมแสดงเปอร์เซ็นต์ความเข้ากัน",
    usage: "/จับคู่",
    permissions: [], // กำหนดสิทธิ์การใช้งานถ้ามี
    aliases: ["match"], // ชื่อเรียกอื่นๆ
  },

  run: async ({ api, event, args }) => {
    try {
      const threadID = event.threadID;
      const senderID = event.senderID;

      // ดึงข้อมูลผู้เข้าร่วมในกลุ่ม
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = threadInfo.participantIDs;

      // กำจัดตัวเองออกจากรายชื่อ
      const filteredParticipants = participants.filter(id => id !== senderID && id !== api.getCurrentUserID());

      if (filteredParticipants.length === 0) {
        return api.sendMessage("❗ ไม่มีสมาชิกในกลุ่มที่สามารถจับคู่ได้ในขณะนี้.", threadID);
      }

      // สุ่มเลือกผู้ใช้หนึ่งคน
      const randomIndex = Math.floor(Math.random() * filteredParticipants.length);
      const matchedUserID = filteredParticipants[randomIndex];

      // ดึงข้อมูลผู้ใช้ที่ถูกจับคู่
      const matchedUserInfo = await api.getUserInfo(matchedUserID);
      const matchedUserName = matchedUserInfo[matchedUserID].name;

      // ดึงรูปโปรไฟล์ของคุณและผู้ที่ถูกจับคู่
      const senderInfo = await api.getUserInfo(senderID);
      const senderName = senderInfo[senderID].name;

      const senderPhoto = await api.getUserInfo(senderID);
      const matchedUserPhoto = await api.getUserInfo(matchedUserID);

      const senderPhotoURL = senderInfo[senderID].thumbnailSrc;
      const matchedUserPhotoURL = matchedUserInfo[matchedUserID].thumbnailSrc;

      // สุ่มเปอร์เซ็นต์ความเข้ากันระหว่าง 50% - 100%
      const compatibility = Math.floor(Math.random() * 51) + 50; // 50 - 100

      // กำหนดคำอธิบายตามเปอร์เซ็นต์
      let compatibilityDescription = "";
      if (compatibility >= 90) {
        compatibilityDescription = "ยอดเยี่ยม! 💖";
      } else if (compatibility >= 75) {
        compatibilityDescription = "ดีมาก! 😊";
      } else if (compatibility >= 60) {
        compatibilityDescription = "ดี! 🙂";
      } else {
        compatibilityDescription = "พอใช้! 😅";
      }

      // สร้างข้อความตอบกลับ
      const message = `
💑 **การจับคู่สำเร็จ!**

👤 **คุณ:** ${senderName}
![Your Profile Picture](${senderPhotoURL})

👤 **คู่ของคุณ:** ${matchedUserName}
![Matched User Profile Picture](${matchedUserPhotoURL})

❤️ **ความเข้ากัน:** ${compatibility}% ${compatibilityDescription}
      `;

      // ส่งข้อความตอบกลับ
      return api.sendMessage(message, threadID);
    } catch (error) {
      console.error(chalk.red("❌ เกิดข้อผิดพลาดในคำสั่งจับคู่:"), error);
      return api.sendMessage("❗ เกิดข้อผิดพลาดในการทำงานของคำสั่งจับคู่.", event.threadID);
    }
  }
};
