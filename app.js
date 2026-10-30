const express = require('express');
require('dotenv').config();
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const userRoutes = require('./routes/userRoutes');
const middleware = require('./middleware');
const port = 3000;



// ตั้งค่าโฟลเดอร์ public สำหรับไฟล์ static
app.use(express.static(__dirname + '/public'));

// ใช้ cookie-parser middleware
app.use(cookieParser());

// ใช้ middleware เพื่อแปลงข้อมูล JSON ที่ส่งมาจาก frontend
app.use(express.json());  

// ตั้งค่า EJS เป็น view engine
app.set('view engine', 'ejs');

app.set('views', __dirname + '/views');

// ใช้ middleware ในการ parse request body
app.use(express.urlencoded({ extended: true }));

// ตั้งค่า express-session
app.use(session({
  secret: '!@#$%^', // คีย์สำหรับเซ็น session ID (ควรใช้คีย์ที่ปลอดภัยในโปรดักชั่น)
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // ตั้ง secure เป็น true เมื่อใช้ HTTPS
}));

app.use('/', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
