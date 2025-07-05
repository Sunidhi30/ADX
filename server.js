const express = require('express');
const app = express();
const db = require('./utils/db')
const cors = require("cors");
const PORT = process.env.PORT  || 9000
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/User")
const adminRoutes = require("./routes/admin")
const facebookRoutes = require("./routes/facebook")
const metaRoutes = require("./routes/metaAds")
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
app.use("/api/users", userRoutes);
app.use('/api/auth/facebook', facebookRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/meta-ads', require('./routes/metaAds'));
app.use('/api/meta-ads',metaRoutes)
app.get("/facebook", (req, res) => {
  res.sendFile(__dirname + "/facebook-test.html");
});
app.get("/testing-facebook", (req, res) => {
  res.sendFile(__dirname + "/testing.html");
});
app.get("/payement", (req, res) => {
  res.sendFile(__dirname + "/subscription-test.html");
});
