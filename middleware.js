const userModel = require('./models/userModel');
const axios = require('axios');


exports.checkForm = async (req,res,next)=>{
    if(req.path === '/form' || req.path === '/homepage') return next();

    const caretaker = await userModel.getCaretaker();
    const doctor = await userModel.getDoctor();
    const elder = await userModel.getElder();
    const relative = await userModel.getRelative();

    // console.log(caretaker[0].userid,doctor[0].userid,relative[0].userid);
    try {
        if(caretaker[0].userid && doctor[0].userid && relative[0].userid){
            console.log('ok');
            res.redirect('/homepage');
        }
        else{
            console.log('error');
            next();
        }
    } catch (error) {
        next();
    }
};

exports.goback =(req,res)=>{
    res.redirect('/form');
}

