require("dotenv").config({path: './.env'});
const mongoDBConnect = require('./db/index');
const app = require('./app')
const port = process.env.PORT || 3000;

mongoDBConnect()
.then(()=>{
    app.listen(port, ()=>{
        console.log(`----- Server is running at Port: ${port} --------`);
    })
})
.catch((err)=>{
    console.log("------DB Connection Failed--------- \n", err);
})



/*
1. start the server and do error handling
2. configure cookie parser and cors
3. create dbHandler utility
4. create apiError utility
5. create apiResponse utility

*/