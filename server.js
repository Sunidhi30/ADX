const express = require('express');
const app = express();
const db = require('./utils/db')
const cors = require("cors");
require('dotenv').config()

const PORT = process.env.PORT 

db();
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(express.json());

app.listen(PORT,()=>{
    console.log(`Server started at ${PORT}`)
 })
