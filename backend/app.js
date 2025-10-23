require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require('path');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./db/connectDB");
const http = require("http");
const { Server } = require("socket.io");


const editorRoutes = require('./routes/editorRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/auth.route');
const profileRoutes = require('./routes/profileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const subtitleRoutes = require('./routes/subtitleRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');
const { verifyToken } = require('./middleware/verifyToken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173", 
            "http://localhost:5174", 
            "http://localhost:3000",
            process.env.CLIENT_URL || "http://localhost:5173"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
});

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        process.env.CLIENT_URL || 'http://localhost:5173'
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.set('socketio', io);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.use("/outputs", express.static(path.join(__dirname, "outputs")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api', transcriptionRoutes);
app.use('/api/editor', editorRoutes);
app.use('/api', fileRoutes);
app.use("/api/v1/users", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/subtitles', subtitleRoutes);


app.get("/", (req, res) => {
    res.send("Welcome to the Video Transcription API with Socket.IO");
});


app.use((err, req, res, next) => {
    console.error("❌ Global Error Handler:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

io.on('connection', (socket) => {
    console.log('🔌 A user connected to Socket.IO:', socket.id);

    socket.on('disconnect', () => {
        console.log('👋 User disconnected:', socket.id);
    });
});

// Cleanup stale presence records every 5 minutes
setInterval(() => {
    collaboration.cleanupStalePresence();
}, 5 * 60 * 1000);

// Export app, server, and io for use in bin/www
module.exports = { app, server, io };