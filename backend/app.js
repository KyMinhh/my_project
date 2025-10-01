require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require('path');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./db/connectDB");
const http = require("http");
const { Server } = require("socket.io");
const RealTimeCollaboration = require('./services/realTimeCollaboration');


const videoController = require("./controllers/videoController");
const youtubeController = require("./controllers/youtubeController");
const tiktokController = require("./controllers/tiktokController");


const editorRoutes = require('./routes/editorRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/auth.route'); // Đảm bảo bạn đã import authRoutes từ routes/auth.route.js
const profileRoutes = require('./routes/profileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const { verifyToken } = require('./middleware/verifyToken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173", // Địa chỉ frontend của bạn
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.set('socketio', io);
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.use("/outputs", express.static(path.join(__dirname, "outputs")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.post("/api/transcribe", upload.single("video"), videoController.transcribeVideo);
app.post("/api/transcribe-from-youtube", youtubeController.transcribeFromYoutube);
app.post("/api/transcribe-from-tiktok", tiktokController.transcribeFromTiktok);


app.use('/api/editor', editorRoutes);


app.use('/api', fileRoutes);
app.use("/api/v1/users", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/collaboration', collaborationRoutes);


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

// Initialize real-time collaboration
const collaboration = new RealTimeCollaboration(io);

// Cleanup stale presence records every 5 minutes
setInterval(() => {
    collaboration.cleanupStalePresence();
}, 5 * 60 * 1000);

server.listen(5001, () => {
    console.log('Serving static files for /uploads from:', path.join(__dirname, 'uploads'));
    connectDB();
    console.log("✅ Database connected successfully.");
    console.log("Server is running on http://127.0.0.1:5001");
});