Internal management software for Thahira Groups, built with Django REST Framework and React.

## Setup Instructions

### Backend Setup (Django REST Framework)

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend Setup (React 18 + Vite)

```bash
cd frontend
npm install
npm run dev
```

## System Credentials


- **Admin Account**: `thahira_admin` / `Admin@2026`
- **Male Employee Initial Password**: Registered Mobile Number (Shift: `10:00 AM`)
- **Female Employee Initial Password**: Registered Mobile Number (Shift: `09:30 AM`)

