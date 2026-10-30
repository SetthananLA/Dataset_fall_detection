const userModel = require('../models/userModel');
const axios = require('axios');

const qs = require('qs');
const cuid = require('cuid');
const path = require('path');
const ml = require('ml-random-forest');
const { json } = require('express');
const { Console } = require('console');
require('dotenv').config();



exports.index = (req, res) => {
    res.redirect('/login');
}

exports.login = async (req, res) => {
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.LINE_CHANNEL_ID}&redirect_uri=${process.env.LINE_REDIRECT_URI}&state=some_random_state&scope=profile%20openid%20email`;
    res.redirect(loginUrl);
}

exports.callback = async (req, res) => {
    const code = req.query.code;

    const data = qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.LINE_REDIRECT_URI,
        client_id: process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET
    });

    try {
        // Exchange the code for an access token
        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenResponse.data.access_token;
        //เก็บ accesstokenใว้ใน sessionz
        req.session.accessToken = accessToken;

        // Get user profile
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        //userid in session
        req.session.userid = profileResponse.data.userId;

        //create user
        const userID = profileResponse.data.userId;
        const name = profileResponse.data.displayName;
        const pictureURL = profileResponse.data.pictureUrl;
        const test = await userModel.createCaretaker(userID, name, pictureURL).then(
            (result) => {
                userModel.createElders(cuid(), '', '', result.id)
            }
        );

        // console.log(test);

        res.redirect('/form');

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

exports.homepage = async (req, res) => {
    const elder = await userModel.getElder();
    const caretaker = await userModel.getCaretaker();

    userModel.getElderById(elder[0].id).then(responds => {
        res.render('homepage.ejs', { olderName: responds.name, olderAddress: responds.address, olderAges: responds.age, careName: caretaker[0].name });
    }).catch(error => {
        console.log(error)
    });

    // res.render('homepage.ejs', { olderName: 'คุณากร', careName: 'เสฏฐนันท์' });
}

exports.form = (req, res) => {
    res.render('form.ejs');
}

exports.submit = async (req, res) => {
    const elder_name = req.body.elder_name;
    const elder_ages = req.body.elder_ages;
    const elder_address = req.body.elder_address;
    const caretakers_name = req.body.caregiver_name;
    const caretakers_id = req.body.caregiver_userid;
    const relative_name = req.body.relative_name;
    const relative_id = req.body.relative_userid;
    const doctor_name = req.body.doctor_name;
    const doctor_id = req.body.doctor_userid;


    const care_result = await userModel.createCaretaker(caretakers_id, caretakers_name);
    const elder_result = await userModel.createElders(elder_name, elder_ages, elder_address);
    const relative_result = await userModel.createRelative(relative_id, relative_name);
    const doctor_result = await userModel.createDoctors(doctor_id, doctor_name);

    if (care_result === 'error' || elder_result === 'error' || relative_result === 'error' || doctor_result === 'error') {
        console.log('error')
        res.render('goback.ejs');
    }
    else {
        res.redirect('/homepage');
    }
}

exports.history = (req, res) => {
    userModel.getHistory().then(result => {
        res.render('history.ejs', { rows: result });
    });

}

exports.detail = (req, res) => {
    const id = req.params.id;
    const pose = req.params.pose;
    const inputDate = req.params.date;
    // สร้าง Date object จากวันที่ที่ได้รับ
    const date = new Date(inputDate);
    const formattedThaiDate = formatThaiDate(date);

    userModel.getPictureById(id).then((result) => {
        res.render('fall_detail.ejs', { picture: result.filename, pose: pose, date: formattedThaiDate });
        // console.log(result)
    });

    function formatThaiDate(date) {
        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

        const dayOfWeek = days[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear() + 543; // ปี พ.ศ.
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} น.`;
    }
}

exports.pic = (req, res) => {
    res.sendFile(path.join(__dirname, '../public/fall.png'));
}

exports.noctification = async (req, res) => {
    const channelAccessToken = process.env.LINE_MESSAGING_API_TOKEN; // ใช้ Token จาก Environment Variables
    const picture = req.params.picture; // รับภาพจาก params
    console.log(picture);

    // ดึง userId จากฐานข้อมูล
    const care_id = await userModel.getCaretaker();
    const relative_id = await userModel.getRelative();
    const doctor_id = await userModel.getDoctor();
    const listID = [care_id[0], relative_id[0], doctor_id[0]];
    console.log(listID[1]);

    // ฟังก์ชันส่งการแจ้งเตือนไปยังแต่ละ userId
    function sendNotification(userId) {
        const messageData = {
            to: userId,
            messages: [
                {
                    type: 'text',
                    text: 'มีการล้มเกิดขึ้น',
                },
                {
                    type: 'image',
                    originalContentUrl: `${process.env.HOST}/uploads/${picture}`, // URL ของภาพที่ต้องการส่ง
                    previewImageUrl: `${process.env.HOST}/uploads/${picture}` // URL ของภาพพรีวิว
                }
            ],
        };

        // ส่งข้อมูลไปยัง LINE API
        axios.post('https://api.line.me/v2/bot/message/push', messageData, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                console.log(`Message sent to ${userId} successfully:`, response.data);
            })
            .catch(error => {
                console.error(`Error sending message to ${userId}:`, error);
            });
    }

    // เริ่มส่งการแจ้งเตือนพร้อมการหน่วงเวลา 30 วินาทีต่อแต่ละคน
    setTimeout(() => {
        sendNotification(listID[0].userid); // ส่งการแจ้งเตือนไปยัง userId แต่ละคน
        console.log(listID[0].userid)
        setTimeout(() => {
            sendNotification(listID[1].userid); // ส่งการแจ้งเตือนไปยัง userId แต่ละคน
            console.log(listID[1].userid)
            setTimeout(() => {
                sendNotification(listID[2].userid); // ส่งการแจ้งเตือนไปยัง userId แต่ละคน
                console.log(listID[2].userid)
            }, 3000); // 30,000 milliseconds = 30 seconds
        }, 3000); // 30,000 milliseconds = 30 seconds
    }, 3000); // 30,000 milliseconds = 30 seconds

    // res.redirect('/homepage');
};







exports.predict = (req, res) => {
    let isSwap = false;
    const trainingData = [
        [0, -5],
        [0, -3.38],
        [0, -3.24],
        [0, -4.94],
        [0, -16.13],
        [0, -2.64],
        [0, -16.66],
        [0, -8.81],
        [0, -19.31],
        [0, -18.87],
        [0, -13.01],
        [0, -14.09],
        [0, -152.54],
        [0, -15.6],
        [0, -18.73],
        [0, -19.93],
        [0, -20.02],
        [0, -9.84],
        [0, -11.88],
        [0, -34.21],
        [0, 0],
        [0, -10.45],
        [0, -153],
        [0, -7.82],
        [0, -13.42],
        [0, -144.15],
        [0, -18.74],
        [0, -8.88],
        [0, -9.12],
        [0, -79.74],//
        [0, 142.57],
        [0, 89.38],
        [0, 30.51],
        [0, 3.26],
        [0, 49.77],
        [0, 74.53],
        [0, 100.9],
        [0, 65.5],
        [0, 28.56],
        [0, 46.88],
        [0, 7.69],
        [0, 174.64],
        [0, 127.36],
        [0, 170.01],
        [0, 167.95],
        [0, 158.23],
        [0, 174.3],
        [0, 173.62],
        [0, 177.28],
        [0, 133.38],
        [0, 173.7],
        [0, 172.35],
        [0, 177.5],
        [0, 169.22],
        [0, 176.84],
        [0, 178.5],
        [0, 178.4],
        [0, 152.23],
        [0, 147.5],
        [0, 180],//
        [-47.66, 0],
        [-65.18, 0],
        [-52.58, 0],
        [-49.33, 0],
        [-45.62, 0],
        [-45.49, 0],
        [-61.19, 0],
        [-53.26, 0],
        [-47.52, 0],
        [-57.73, 0],
        [-48.84, 0],
        [-172.7, 0],
        [152.78, 0],
        [-131.03, 0],
        [-144, 0],
        [-133.58, 0],
        [-170.38, 0],
        [-153.54, 0],
        [-134.94, 0],
        [-177.86, 0],
        [-152.17, 0],
        [-162.81, 0],
        [-102.04, 0],
        [-96.8, 0],
        [-65.49, 0],
        [-92.74, 0],
        [-107.71, 0],
        [-103.15, 0],
        [-89.98, 0],
        [-101.83, 0],//
        [102.35, 0],
        [81.4, 0],
        [84.85, 0],
        [90.77, 0],
        [102.53, 0],
        [96.68, 0],
        [106.19, 0],
        [94.8, 0],
        [98.04, 0],
        [81.37, 0],
        [102.68, 0],
        [84.58, 0],
        [91.11, 0],
        [104.19, 0],
        [107.3, 0],
        [100.19, 0],
        [94.16, 0],
        [99.99, 0],
        [92.4, 0],
        [96.67, 0],
        [91.52, 0],
        [92.52, 0],
        [93.49, 0],
        [89.25, 0],
        [93.56, 0],
        [93.52, 0],
        [90.82, 0],
        [91.33, 0],
        [94.81, 0],
        [94.81, 0]
    ];

    const labels = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3,
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3
    ];

    // const labels1 = labels.slice(0, 58);
    // const labels2 = labels.slice(58, labels.length);

    // const traindata1 = trainingData.slice(0, 58);
    // const traindata2 = trainingData.slice(58, labels.length);


    // การตั้งค่า treeOptions
    const treeOptions = {
        maxDepth: 10,
        minSamplesSplit: 2,
        minSamplesLeaf: 1,
        maxFeatures: 2,
        criterion: 'gini'
    };

    const options = {
        seed: 42, // ค่าเริ่มต้นของการสุ่ม เพื่อให้การทดลองสามารถทำซ้ำได้
        nEstimators: 100, // จำนวนต้นไม้ในป่า (มากกว่าหมายความว่าต้นไม้จะช่วยเพิ่มความแม่นยำ)
        bootstrap: true, // ใช้การเลือกซ้ำในการสร้างตัวอย่างฝึกอบรม
        oobScore: true, // ไม่คำนวณคะแนน Out-of-Bag (คำนวณได้ช้ากว่า)
        classWeight: null, // ใช้ค่าเริ่มต้นของน้ำหนักคลาส (ไม่กำหนดน้ำหนักพิเศษสำหรับคลาสต่าง ๆ)
        treeOptions: treeOptions,
        useSampleBagging: true,
    };

    const testdata = generateArray();
    const testlabels = generateLabels();

    const classifier = new ml.RandomForestClassifier(options);

    classifier.train(trainingData, labels);

    const arr = [[parseFloat(req.body[0][0]), parseFloat(req.body[0][1])]];


    // const shuffle = shuffleArray(randomtest[0], randomtest[1]);


    // ทำนายค่าด้วย testSet
    const predict = classifier.predict(arr);

    // console.log(accuracy(predict, labels))
    res.send(predict);

    function accuracy(predictLabels, testLabels) {
        let score = 0;
        predictLabels.map((labels, index) => {
            if (labels === testLabels[index]) {
                score++;
            }
            else {
                console.log(`ทำนายผิด predictlabels ${labels} testlabels ${testLabels[index]} value [${testdata[index]}]`);
            }
        });
        console.log(`ทำนายถูก ${score} จาก ${testLabels.length}`);
        return score / predictLabels.length * 100;
    }


    function generateArray() {
        const length = 1200;
        const arr = [];

        for (let k = 0; k < length; k++) {
            if (k < 300) {
                // ช่อง 0 ถึง 299
                const value = Math.random() * -180; // สุ่มค่าในช่วง -180 ถึง 0
                arr.push([0, value]);
            } else if (k < 600) {
                // ช่อง 300 ถึง 599
                const value = Math.random() * 180; // สุ่มค่าในช่วง 0 ถึง 180
                arr.push([0, value]);
            } else if (k < 900) {
                // ช่อง 600 ถึง 899
                const value = Math.random() * -180; // สุ่มค่าในช่วง -180 ถึง 0
                arr.push([value, 0]);
            } else {
                // ช่อง 900 ถึง 1199
                const value = Math.random() * 180; // สุ่มค่าในช่วง 0 ถึง 180
                arr.push([value, 0]);
            }
        }

        return arr;
    }

    function generateLabels() {
        const length = 1200;
        const arr = [];

        for (let k = 0; k < length; k++) {
            arr.push(Math.floor(k / 300)); // ทุก ๆ 400 ช่อง จะเพิ่มค่า 1
        }

        return arr;
    }


}



// function shuffleArray(data, labels) {
//     for (let i = data.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [data[i], data[j]] = [data[j], data[i]];
//         [labels[i], labels[j]] = [labels[j], labels[i]];
//     }
//     return [data, labels];
// }
