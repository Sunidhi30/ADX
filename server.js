const express = require('express');
const app = express();
const db = require('./utils/db')
const cors = require("cors");
const PORT = process.env.PORT  || 9000
const authRoutes = require("./routes/authRoutes")
require('dotenv').config()


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

//all the basic apis 
app.use("/api/auth", authRoutes);