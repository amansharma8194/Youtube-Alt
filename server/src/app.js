const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

// ---------- Common Initialization ----------

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({limit: "16kb", extended: true}))
app.use(express.static("public"));
app.use(cookieParser());





module.exports = app;