const axios = require("axios");

module.exports.config = {
    name: "สร้างภาพ",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "YourName",
    description: "สร้างภาพจากคำสั่งผ่าน AI",
    commandCategory: "AI",
    usages: "<คำอธิบายภาพ>",
    cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
    if (args.length === 0) {
        api.sendMessage("กรุณาระบุคำอธิบายภาพ เช่น /สร้างภาพ สาวสวย", event.threadID, event.messageID);
        return;
    }

    const prompt = args.join(" "); // รวมคำอธิบายภาพจากผู้ใช้
    const width = 1024; // ความกว้างของภาพ
    const height = 1024; // ความสูงของภาพ

    try {
        // แจ้งข้อความ "กำลังสร้างภาพ"
        const creatingMessage = await api.sendMessage("🎨 กำลังสร้างภาพ โปรดรอสักครู่...", event.threadID);

        // เรียก API เพื่อสร้างภาพ
        const response = await axios.get(`https://api.kenliejugarap.com/turbo-image-gen/?width=${width}&height=${height}&prompt=${encodeURIComponent(prompt)}`);
        const data = response.data;

        if (data.status) {
            const imageUrl = data.response;
            const note = data.note || "กรุณาดาวน์โหลดภาพนี้ภายใน 10 นาที เนื่องจากระบบจะลบภาพอัตโนมัติหลังจากนั้น";

            // ลบข้อความ "กำลังสร้างภาพ"
            await api.deleteMessage(creatingMessage.messageID);

            // ส่ง URL ของภาพที่สร้างสำเร็จให้ผู้ใช้
            api.sendMessage(
                `✨ ภาพของคุณพร้อมแล้ว!\nคำอธิบาย: ${prompt}\n\n📌 ลิงก์ภาพ: ${imageUrl}\n\n🕒 หมายเหตุ: ${note}`,
                event.threadID,
                event.messageID
            );
        } else {
            // หากสร้างภาพไม่สำเร็จ
            api.sendMessage("ไม่สามารถสร้างภาพได้ กรุณาลองใหม่อีกครั้ง", event.threadID, event.messageID);
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ API:", error);

        // ลบข้อความ "กำลังสร้างภาพ" หากเกิดข้อผิดพลาด
        await api.deleteMessage(creatingMessage.messageID);

        api.sendMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับ API กรุณาลองใหม่อีกครั้ง", event.threadID, event.messageID);
    }
};
