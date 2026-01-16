# 🎉 SPG Mitgliederportal

Modernes Mitgliederportal mit PWA-Support für Sportvereine.

## ✨ Features

- 🔐 Sicheres Login mit Session-Management
- 👥 Profilansicht mit Mitgliederdaten (MSSQL)
- 📧 Benachrichtigungssystem mit Datei-Upload
- 📅 Termine & Veranstaltungen mit Umfragen
- ⚙️ Admin-Bereich für Einstellungen
- 📱 PWA-Support (iOS & Android)
- 🔔 Push-Benachrichtigungen

## 🚀 Schnellstart
```bash
# Dependencies installieren
npm install

# .env erstellen
cp .env.example .env

# .env editieren
nano .env

# Server starten
npm start

# Entwicklung mit Auto-Reload
npm run dev
```

Server läuft auf: http://localhost:3000

## 🔧 Konfiguration

Alle Einstellungen in `.env`:
```env
# Server
PORT=3000
BASE_URL=https://portal.example.com
NODE_ENV=production

# MSSQL Database
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=spg_verein
DB_USER=username
DB_PASSWORD=password
DB_ENCRYPT=false

# Admin (MitgliedID aus SPG)
ADMIN_MEMBER_ID=0000000002

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=Mitgliederportal

# Weitere Einstellungen
SESSION_DAYS=30
MAX_UPLOAD_MB=15
```

## 📁 Projektstruktur