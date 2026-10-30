const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const Middleware = require('../middleware');
const multer = require('multer');
const path = require('path')
const userModel = require('../models/userModel');
const axios = require('axios');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

// ตั้งค่า LINE SDK
const client = new Client({
  channelAccessToken: process.env.LINE_MESSAGING_API_TOKEN,
  channelSecret: process.env.SECRET_CHANNEL
});

// กำหนดที่เก็บไฟล์บนเซิร์ฟเวอร์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // กำหนดโฟลเดอร์ที่ต้องการเก็บไฟล์
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // ตั้งชื่อไฟล์ใหม่
  },
});



// สร้างตัวจัดการอัพโหลด
const upload = multer({ storage });


// // กำหนด storage ให้เป็น memoryStorage
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// กำหนดเส้นทาง
router.get('/', Middleware.checkForm, userController.form);

router.get('/callback', userController.callback);

router.get('/homepage', userController.homepage);

router.get('/form', userController.form);

router.post('/submit', userController.submit);

router.get('/history', userController.history);

router.get('/detail/:id/:pose/:date', userController.detail);

router.get('/pic', userController.pic);

router.post('/predict', userController.predict);

router.get('/noctification/:picture', userController.noctification);

// กำหนด route สำหรับรับไฟล์จากไคลเอนต์
router.post('/upload', upload.single('file'), (req, res) => {

  userModel.getElder().then(result => {
    const pose = req.body.pose; // อ่านค่าของ pose ที่ถูกส่งมา
    if (req.file) {
      const picture = req.file.filename;

      userModel.createHistory(req.file.filename, result[0].name, pose).then((result) => {
        axios.get(`${process.env.HOST}/noctification/${picture}`)
          .then(response => {
            // จัดการกับข้อมูลที่ได้รับจาก API
            console.log('Data received:', response.data);
          })
          .catch(error => {
            // จัดการกับข้อผิดพลาด
            console.error('Error fetching data:', error);
          });
      }).catch(error => {
        console.log(error)
      });
      res.status(200).send('File uploaded successfully');
    } else {
      res.status(400).send('Error uploading file');
    }
  });


});

// Endpoint สำหรับรับข้อมูล webhook
router.post('/webhook', async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const receivedMessage = event.message.text;

      // ขอuserid
      if (receivedMessage === 'ขอuserid') {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `userID ของคุณคือ \n${userId}`
        });
      }

      // ได้รับการแจ้งเตือน
      if (receivedMessage === 'ครับ' || receivedMessage === 'รับทราบ' || receivedMessage === 'Ok') {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `คุณได้รับการแจ้งเตือนแล้ว`
        });
      }
    }
  }

  res.sendStatus(200);
});



module.exports = router;
