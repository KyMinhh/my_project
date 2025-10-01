# Video Transcription Platform

A comprehensive web application for video transcription, editing, and collaboration. This platform allows users to upload videos, convert them to text using advanced AI services, edit transcripts, and collaborate in real-time.

## Features

- **Video Upload & Processing**: Support for multiple video formats with secure cloud storage
- **AI-Powered Transcription**: Integration with Google Cloud Speech-to-Text and other AI services
- **Real-time Collaboration**: Multi-user editing with live presence indicators
- **Transcript Editor**: Rich text editing with timestamp synchronization
- **Multi-language Support**: Internationalization with English and Vietnamese
- **User Authentication**: Secure JWT-based authentication system
- **Dashboard & Analytics**: User statistics and project management
- **Social Media Integration**: Direct import from YouTube and TikTok
- **Export Options**: Multiple export formats for transcripts and videos

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** for data storage
- **Google Cloud Platform** for AI services and storage
- **Socket.io** for real-time features
- **JWT** for authentication
- **FFmpeg** for video processing

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React i18next** for internationalization
- **Axios** for API communication

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Google Cloud Platform account with necessary APIs enabled
- FFmpeg installed on the system

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KyMinhh/my_project.git
   cd my_project
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Copy environment variables
   create .env in backend
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Database Setup**
   - Ensure MongoDB is running
   - The application will create collections automatically

## Environment Variables

Create `.env` files in both backend and frontend directories:

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video_transcription
JWT_SECRET=your_jwt_secret
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
YOUTUBE_API_KEY=your_youtube_api_key
TIKTOK_API_KEY=your_tiktok_api_key
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Usage

1. Start the backend server: `npm run dev` in backend directory
2. Start the frontend: `npm run dev` in frontend directory
3. Open http://localhost:5173 in your browser
4. Register/Login to access the platform
5. Upload videos and start transcribing!

## API Documentation

The backend provides RESTful APIs for:
- User management
- Video upload and processing
- Transcript management
- Collaboration features

API endpoints are available at `http://localhost:5000/api`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## Project Structure

```
my_project/
├── backend/
│   ├── controllers/     # Route controllers
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── middleware/     # Custom middleware
│   ├── sockets/        # WebSocket handlers
│   └── uploads/        # File uploads
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   └── utils/      # Utility functions
│   └── public/         # Static assets
└── docs/              # Documentation
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- **Author**: KyMinh, DieuMi
- **Email**: [vkminh04.c23xuantruong@gmail.com]
- **GitHub**: [https://github.com/KyMinhh](https://github.com/KyMinhh)

## Roadmap

- [ ] Advanced AI transcription models
- [ ] Mobile app development
- [ ] Integration with more social platforms
- [ ] Real-time video editing
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard

---

*Built with ❤️ for efficient video transcription and collaboration*
