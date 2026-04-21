# 🏙️ CivicSense AI
### The Living Nervous System for Modern Urban Intelligence

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://amit328-civicsense.vercel.app)
[![Hugging Face Deployment](https://img.shields.io/badge/Backend-Hugging%20Face-yellow?logo=huggingface)](https://huggingface.co/spaces/Amit328/civicsense-backend)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**CivicSense AI** is a state-of-the-art urban management platform that bridges the gap between citizens and municipal authorities. Using high-performance AI Vision, real-time GPS telemetry, and a sleek "Cyber-SaaS" interface, it simplifies the process of identifying, reporting, and resolving city infrastructure issues.

---

## 🚀 Key Features

### 🛡️ For Citizens
- **AI-Quick Report**: Snap a photo and let our AI classify the damage (Potholes, Garbage, Road Cracks) automatically.
- **GPS Precision**: Auto-captures telemetry for exact location pinning.
- **Identity Protection**: Choose between official or anonymous reporting.

### 🏛️ For Officials & Admins
- **Admin Command Centre**: Full system analytics including resolution rates and high-risk zones.
- **User Management**: Master-Admin capability to assign and manage official identities.
- **SLA Tracking**: Real-time monitoring of overdue reports to ensure urban health.
- **Heatmap Intelligence**: Visualize city-wide issues with multi-color risk scoring.

---

## 🛠️ The Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Framer Motion, Axios, Material UI Icons |
| **Backend** | FastAPI, PostgreSQL (SQLAlchemy), SlowAPI (Rate Limiting) |
| **AI / ML** | Gemini 1.5 Pro, Groq (LPU), Custom Roboflow/XGBoost Models |
| **Storage** | Cloudinary (Media), Neon.tech (Database), Redis (Caching) |
| **Deployment** | Vercel (UI), Hugging Face Spaces (Backend API) |

---

## ⚙️ Environment Configuration

To run this project locally, ensure you have a `.env` file in the root directory with the following signatures:

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@host/dbname
SECRET_KEY=your_jwt_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
GOOGLE_CLIENT_ID=your_google_id
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_id
```

---

## 📦 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Amitkushwaha328/CivicSense-AI.git
   cd CivicSense-AI
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🤝 Contributing

We welcome contributions from developers, urban planners, and AI enthusiasts!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

**Built with ❤️ for a better urban future.**
