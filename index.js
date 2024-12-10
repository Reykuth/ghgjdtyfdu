// index.js
const fs = require("fs");
const login = require("ryuu-fca-api");
const axios = require("axios");
const express = require("express");
const chalk = require("chalk");
const figlet = require("figlet");

const prefix = "/";

// โหลดคำสั่งจากโฟลเดอร์ commands
const commands = {};
if (fs.existsSync("./commands")) {
  fs.readdirSync("./commands").forEach(file => {
    if (file.endsWith(".js")) {
      const command = require(`./commands/${file}`);
      commands[command.config.name.toLowerCase()] = command;
      console.log(chalk.green(`📦 โหลดคำสั่ง: ${command.config.name}`));
    }
  });
}

// โหลดเหตุการณ์จากโฟลเดอร์ events
const events = {};
if (fs.existsSync("./events")) {
  fs.readdirSync("./events").forEach(file => {
    if (file.endsWith(".js")) {
      const eventCommand = require(`./events/${file}`);
      if (eventCommand.config && eventCommand.config.eventType) {
        eventCommand.config.eventType.forEach(type => {
          if (!events[type]) events[type] = [];
          events[type].push(eventCommand);
        });
        console.log(chalk.blue(`🔔 โหลดเหตุการณ์: ${file}`));
      }
    }
  });
}

// ฟังก์ชันเรียก Simsimi API
const simiApiKey = "RHQgp8DIh5.ixcWFpjwmcC4tIO1rPV-b89.5_seS";
const simiUrl = "https://wsapi.simsimi.com/190410/talk";
const simiLang = "th";

async function handleAutoReply(message) {
  try {
    const response = await axios.post(simiUrl, {
      utext: message,
      lang: simiLang
    }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": simiApiKey
      }
    });
    const { atext } = response.data;
    return atext;
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการคุยกับ SimSimi:", error);
    return "❗ ขอโทษครับ เกิดข้อผิดพลาดในการเชื่อมต่อ SimSimi";
  }
}

// Set ป้องกันการตอบซ้ำ
const respondedMessages = new Set();

// เริ่มเข้าสู่ระบบ Facebook
login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) {
    console.error(chalk.red("❌ เกิดข้อผิดพลาดในการเข้าสู่ระบบ:"), err);
    return;
  }

  console.log(
    chalk.yellow(
      figlet.textSync("Bot Started!", {
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
  console.log(chalk.green(`✅ เข้าสู่ระบบสำเร็จ! คำนำหน้าคำสั่งคือ "${prefix}"`));

  api.setOptions({ listenEvents: true });

  api.listenMqtt(async (err, event) => {
    if (err) {
      console.error(chalk.red("❌ เกิดข้อผิดพลาดในการฟัง:"), err);
      return;
    }

    // จัดการเหตุการณ์จำพวก logMessageType
    if (event.logMessageType && events[event.logMessageType]) {
      for (const eventCommand of events[event.logMessageType]) {
        try {
          await eventCommand.run({ api, event, axios });
          console.log(chalk.blue(`🔄 ประมวลผลเหตุการณ์: ${eventCommand.config.name}`));
        } catch (error) {
          console.error(chalk.red(`❌ เกิดข้อผิดพลาดในเหตุการณ์ "${eventCommand.config.name}":`), error);
        }
      }
    }

    if (event.type === "message") {
      const userID = event.senderID;
      const messageID = event.messageID;
      const message = event.body ? event.body.trim() : "";

      if (!message || userID === api.getCurrentUserID()) return;

      // ป้องกันการตอบซ้ำ
      if (respondedMessages.has(messageID)) return;
      respondedMessages.add(messageID);
      setTimeout(() => {
        respondedMessages.delete(messageID);
      }, 10000);

      // เช็ค prefix
      if (message.startsWith(prefix)) {
        const args = message.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands[commandName];

        if (command && typeof command.run === 'function') {
          try {
            await command.run({ api, event, args, user: null });
            console.log(chalk.green(`✅ รันคำสั่ง: ${commandName}`));
          } catch (error) {
            console.error(chalk.red("❌ เกิดข้อผิดพลาดในคำสั่ง:"), error);
            api.sendMessage("❗ เกิดข้อผิดพลาดในการรันคำสั่ง", event.threadID, event.messageID);
          }
        } else {
          // ไม่เจอคำสั่ง ตอบด้วย Simsimi
          const replyText = await handleAutoReply(message);
          api.sendMessage(replyText, event.threadID, event.messageID);
        }

      } else {
        // ไม่มี prefix ตอบด้วย Simsimi
        const replyText = await handleAutoReply(message);
        api.sendMessage(replyText, event.threadID, event.messageID);
      }
    }

    // จัดการ message_reply ถ้ามี
    if (event.type === "message_reply") {
      if (!global.client) global.client = {};
      if (!global.client.handleReply) global.client.handleReply = [];

      const { messageID, senderID } = event;
      for (const handleReply of global.client.handleReply) {
        if (handleReply.messageID == messageID && handleReply.author == senderID) {
          try {
            const command = commands[handleReply.name];
            if (command && typeof command.handleReply === 'function') {
              await command.handleReply({ api, event, handleReply });
              global.client.handleReply = global.client.handleReply.filter(item => item.messageID != messageID);
              console.log(chalk.magenta(`🔄 จัดการ handleReply ของคำสั่ง: ${handleReply.name}`));
              break;
            }
          } catch (error) {
            console.error(chalk.red("❌ เกิดข้อผิดพลาดในการ handleReply:"), error);
          }
        }
      }
    }
  });
});

// สร้างเซิร์ฟเวอร์ Express สำหรับรองรับการเข้าถึงหน้าเว็บ
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🤖 บอทกำลังทำงานอยู่!");
});

app.listen(PORT, () => {
  console.log(chalk.cyan(`🌐 เซิร์ฟเวอร์กำลังทำงานที่พอร์ต ${PORT}`));
});
