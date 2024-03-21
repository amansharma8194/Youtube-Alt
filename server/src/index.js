require("dotenv").config({path: './.env'});
const express = require('express');
const mongoDBConnect = require('./db/index');

const app = express();

mongoDBConnect();