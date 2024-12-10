// match.js
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

      // กำจัดตัวเองและบอทออกจากรายชื่อ
      const filteredParticipants = participants.filter(id => id !== senderID && id !== api.getCurrentUserID());

      if (filteredParticipants.length === 0) {
        return api.sendMessage("❗ ไม่มีสมาชิกในกลุ่มที่สามารถจับคู่ได้ในขณะนี้.", threadID);
      }

      // สุ่มเลือกผู้ใช้หนึ่งคน
      const randomIndex = Math.floor(Math.random() * filteredParticipants.length);
      const matchedUserID = filteredParticipants[randomIndex];

      // ดึงข้อมูลผู้ใช้ที่ถูกจับคู่
      const matchedUserInfo = await api.getUserInfo(matchedUserID);
      console.log('Matched User Info:', matchedUserInfo); // ตรวจสอบข้อมูลในคอนโซล
      const matchedUserName = matchedUserInfo[matchedUserID].name;

      // ดึงข้อมูลผู้ใช้ของคุณเอง
      const senderInfo = await api.getUserInfo(senderID);
      console.log('Sender Info:', senderInfo); // ตรวจสอบข้อมูลในคอนโซล
      const senderName = senderInfo[senderID].name;

      // ดึงรูปโปรไฟล์ของคุณและผู้ที่ถูกจับคู่
      // สมมติว่าใช้ฟิลด์ 'profileUrl' หรือ 'photo' ในข้อมูลผู้ใช้
      // ถ้าไม่มี, สร้าง URL รูปโปรไฟล์ด้วย Facebook Graph API
      const getProfilePicURL = (userInfo) => {
        // ตรวจสอบฟิลด์ที่มีอยู่
        if (userInfo.profileUrl) {
          return userInfo.profileUrl;
        } else if (userInfo.photo) {
          return userInfo.photo;
        } else {
          // สร้าง URL ด้วย Graph API
          return `https://graph.facebook.com/${userInfo.id}/picture?type=large`;
        }
      };

      const senderPhotoURL = getProfilePicURL(senderInfo[senderID]);
      const matchedUserPhotoURL = getProfilePicURL(matchedUserInfo[matchedUserID]);

      // ตรวจสอบว่ารูปโปรไฟล์ถูกดึงมาได้หรือไม่
      if (!senderPhotoURL || !matchedUserPhotoURL) {
        return api.sendMessage("❗ ไม่สามารถดึงรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง.", threadID);
      }

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

      // ฟังก์ชันดึงรูปโปรไฟล์เป็น Buffer
      const getImageBuffer = async (url) => {
        try {
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          return Buffer.from(response.data, 'binary');
        } catch (error) {
          console.error(`❌ ไม่สามารถดึงรูปจาก URL: ${url}`, error);
          return null;
        }
      };

      const senderPhotoBuffer = await getImageBuffer(senderPhotoURL);
      const matchedUserPhotoBuffer = await getImageBuffer(matchedUserPhotoURL);

      // ตรวจสอบว่ารูปภาพถูกดึงมาได้หรือไม่
      if (!senderPhotoBuffer || !matchedUserPhotoBuffer) {
        return api.sendMessage("❗ ไม่สามารถดึงรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง.", threadID);
      }

      // สร้างข้อความตอบกลับ
      const message = `
💑 **การจับคู่สำเร็จ!**

👤 **คุณ:** ${senderName}

👤 **คู่ของคุณ:** ${matchedUserName}

❤️ **ความเข้ากัน:** ${compatibility}% ${compatibilityDescription}
      `;

      // ส่งข้อความพร้อมกับรูปภาพเป็น Attachments
      const attachments = [
        senderPhotoBuffer,
        matchedUserPhotoBuffer
      ];

      return api.sendMessage({ body: message, attachment: attachments }, threadID);
    } catch (error) {
      console.error(chalk.red("❌ เกิดข้อผิดพลาดในคำสั่งจับคู่:"), error);
      return api.sendMessage("❗ เกิดข้อผิดพลาดในการทำงานของคำสั่งจับคู่.", event.threadID);
    }
  }
};
