const mongoose = require('mongoose');
const DB_NAME = require('../constants');


const mongoDBConnect = async () => {
    try {
        const resp = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB Connected !! DB Host: ${resp.connection.host}`);

    } catch (error) {
        console.log("--------- MongoDB Connection Failed--------");
        console.log(error);
        process.exit(1);
    }
}

module.exports =  mongoDBConnect;