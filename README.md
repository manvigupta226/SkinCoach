# ✨ SkinCoach — AI-Powered Personalized Skincare Companion
SkinCoach is an AI skincare companion that simplifies routines, ingredients, and product choices using a powerful multi-agent system.

# 🚀 Setup Instructions
```
git clone https://github.com/yourusername/skincoach.git
cd skincoach
```
# 🔧 Backend Setup (FastAPI)
## 1. Create virtual environment
```
python -m venv .venv
.\.venv\Scripts\activate

```
## 2. Install dependencies
```
pip install -r requirements.txt

```
## 3. Environment variables
```
DATABASE_URL=sqlite:///./skincoach.db
SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_key_here

```
## 4. Run backend
```
uvicorn backend.main:app --reload

```
# 🎨 Frontend Setup (React + TS + Vite)
```
cd frontend
npm install
npm run dev

```

# Project Structure
```
backend/
  main.py
  models.py
  schemas.py
  db.py
  auth.py
  ...
frontend/
  src/
    pages/
    components/
    api.ts
    ...
agents/
  skincoach_agent/
    agent.py
    tools/
    ...
product_catalog/
  skincare_products.csv

```
# Flow Diagram
<img width="4564" height="1208" alt="image" src="https://github.com/user-attachments/assets/9cee7abb-7577-4505-a527-da509729e3b2" />

# 🏁 How to Use the App

1. Create an account
2. Fill your skin profile
3. Log diary entries
4. Chat with SkinCoach
5. Visit Routine Page (Past routines + new updated routines)

# System Architecture
<img width="2268" height="1841" alt="Untitled (1)" src="https://github.com/user-attachments/assets/f6c30cdd-37c9-462e-80bb-20b2fefb29fb" />



