# 🏛️ SPG Portal - Mitgliederportal

Ein modernes, sicheres Mitgliederportal für die KG Wispelten mit Express.js, SQLite und MSSQL-Anbindung.

## ✨ Features

### 🔐 Authentifizierung & Sicherheit
- Sichere Passwort-Hashing mit PBKDF2 (210.000 Iterationen)
- Session-Management mit automatischem Cleanup
- Rate Limiting auf Login und API-Endpoints (konfigurierbar)
- Test-Email mit passwortloser Anmeldung (nur Development)
- Passwort-Reset mit Token-basiertem Flow
- httpOnly Cookies für Session-Tokens

### 📱 Responsive Design
- Modernes Design mit CSS-Variablen
- Vollständig responsive (Mobile, Tablet, Desktop)
- Gradient-Buttons und smooth Animations
- Professionelle Fehler- und Erfolgsmeldungen

### 🗄️ Datenbanken
- MSSQL Integration: Liest Mitgliederdaten aus SPG-Verein Datenbank
- SQLite lokal: Sessions, Credentials, Password-Reset-Tokens
- Automatische Datenbank-Initialisierung

### 📧 E-Mail Features
- Passwort-Reset via E-Mail
- SMTP-Integration (Strato, Gmail, etc.)
- Template-basierte E-Mails

### 🎯 Seiten
- Login - Anmeldung mit E-Mail & Passwort
- Profil - Benutzerprofil-Verwaltung
- Benachrichtigungen - Nachrichten und Mitteilungen
- Passwort - Passwort-Änderung
- Admin - Admin-Panel (geschützt)
- Events - Veranstaltungskalender

## 🚀 Installation

### Voraussetzungen
- Node.js >= 18
- npm >= 9
- MSSQL-Server mit SPG-Verein Datenbank
- (Optional) Strato oder ähnlicher SMTP-Provider

### Setup

```bash
# 1. Repository klonen
git clone <repo-url>
cd spg-portal

# 2. Dependencies installieren
npm install

# 3. .env konfigurieren
cp .env.example .env
nano .env

# 4. Admin-Passwort setzen
node scripts/reset-password.js

# 5. Server starten
npm run dev
```

Server läuft dann auf: http://localhost:3000

## ⚙️ Konfiguration

Alle Einstellungen in `.env` (Vorlage: `.env.example`)

**Wichtigste Variablen:**

```env
# Datenbank (MSSQL)
DB_SERVER=dein-server.de
DB_USER=username
DB_PASSWORD=passwort
DB_DATABASE=datenbank

# Server
PORT=3000
NODE_ENV=production
BASE_URL=https://portal.example.de

# SMTP (E-Mail)
SMTP_HOST=smtp.strato.de
SMTP_USER=email@example.de
SMTP_PASSWORD=passwort

# Rate Limiting (in Millisekunden)
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=30
API_RATE_LIMIT_WINDOW_MS=60000
```

Alle möglichen Variablen siehe `.env.example`.

## 📁 Projektstruktur

```
spg-portal/
├── public/                 # Statische Dateien & Pages
│   ├── pages/             # HTML-Seiten
│   │   ├── login.html
│   │   ├── profil.html
│   │   ├── benachrichtigungen.html
│   │   ├── passwort.html
│   │   ├── admin.html
│   │   └── events.html
│   ├── shared/            # Gemeinsame JS-Module
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── utils.js
│   ├── styles.css         # Hauptstyles mit CSS-Variablen
│   ├── sw.js              # Service Worker
│   └── debug.html         # Debug-Tools
├── src/
│   ├── config/            # Konfigurationsdateien
│   ├── db/                # MSSQL & SQLite Connectoren
│   ├── middleware/        # Auth, Validation, Rate Limiting
│   ├── routes/            # API-Endpoints
│   ├── services/          # Business Logic (auth, email, etc.)
│   └── utils/             # Crypto, Validators, Helpers
├── scripts/               # Admin-Skripte
│   ├── reset-password.js  # Passwort zurücksetzen
│   ├── setup-admin.js     # Admin-Setup
│   └── check-email.js     # Email-Validierung
├── data/                  # SQLite Datenbank (lokal)
├── uploads/               # User-Uploads
├── .env.example           # Konfigurationsvorlage
├── README.md              # Diese Datei
└── server.js              # Hauptserver
```

## 🧪 Testing

### Debug-Seite
Öffne http://localhost:3000/debug.html

Funktionalität:
- Umgebungsvariablen überprüfen
- Login-Funktionalität testen
- Email-Validierung in MSSQL prüfen
- Credentials in SQLite überprüfen

### Test-Credentials

```
E-Mail: fabian.koch1998@gmail.com
Passwort: Start1234!
```

Diese Email kann sich ohne echte Passwort-Validierung anmelden (wenn `REQUIRE_PASSWORD=true`).

## 🔒 Rate Limiting

Alle Limits sind in `.env` konfigurierbar!

| Endpoint | Default | Fenster |
|----------|---------|---------|
| `/api/auth/login` | 5 Versuche | 15 Min |
| `/api/` (allgemein) | 100 Requests | 15 Min |
| API-Calls | 30 Requests | 1 Min |

**Antwort bei Limit-Überschreitung:** HTTP 429 Too Many Requests

**Zu ändern in .env:**
```env
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=30
API_RATE_LIMIT_WINDOW_MS=60000
```

## 🔐 Authentifizierung

### Login-Flow
1. User gibt E-Mail und Passwort ein
2. Email wird validiert gegen MSSQL
3. Credentials aus SQLite abrufen
4. Passwort mit PBKDF2 verifizieren
5. Session erstellen und Token ausstellen
6. Token in httpOnly Cookie speichern

### Passwort-Reset
1. User beantragt Reset mit E-Mail
2. Token wird generiert und per E-Mail versendet
3. User folgt Link mit Token
4. Neues Passwort wird gesetzt und gehashed
5. Token wird gelöscht

## 📧 E-Mail-Konfiguration

### SMTP mit Strato
```env
SMTP_HOST=smtp.strato.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=deine-email@example.de
SMTP_PASSWORD=strato-passwort
SMTP_FROM_EMAIL=deine-email@example.de
SMTP_FROM_NAME=KG Wispelten Portal
```

### SMTP mit Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=deine-email@gmail.com
SMTP_PASSWORD=app-password
```

## 🐛 Bekannte Probleme & Lösungen

### Email-Eingabe verliert Punkt
**Problem:** HTML type="email" entfernt manchmal den Punkt  
**Lösung:** Verwende `type="text"` für E-Mail-Felder

### Login schlägt fehl
**Überprüfungen:**
1. http://localhost:3000/debug.html nutzen
2. Email in MSSQL vorhanden? (tbl_Mitglied)
3. Credentials in SQLite? (→ "Credentials prüfen")
4. Passwort mit `node scripts/reset-password.js` zurücksetzen

### MSSQL Verbindung fehlgeschlagen
**Überprüfungen:**
1. DB_SERVER, DB_USER, DB_PASSWORD korrekt?
2. MSSQL-Server erreichbar?
3. Firewall lässt Port 1433 durch?

## 📚 API-Endpoints

### Öffentlich
```
GET  /api/public/health
GET  /api/public/settings
GET  /api/public/debug/env
POST /api/public/debug/validate-email
POST /api/public/debug/credentials
```

### Authentifizierung
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/password/forgot
POST /api/auth/password/reset/:token
```

### Geschützt (mit Session)
```
GET  /api/profile
POST /api/profile/update
POST /api/password/change
GET  /api/notifications
POST /api/notifications/read
```

### Admin (nur ADMIN_MEMBER_ID)
```
GET  /api/admin/members
GET  /api/admin/stats
```

## 🚀 Deployment

### Production-Checklist
- [ ] `.env` mit echten Werten ausfüllen
- [ ] `NODE_ENV=production` setzen
- [ ] TEST_EMAIL aus .env entfernen
- [ ] Rate Limiting getestet
- [ ] HTTPS aktiviert
- [ ] MSSQL-Credentials sicher
- [ ] SMTP-Provider konfiguriert
- [ ] SSL-Zertifikate installiert

### Mit PM2
```bash
npm install -g pm2
pm2 start server.js --name "spg-portal"
pm2 save
pm2 startup
```

### Mit Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 👨‍💻 Entwicklung

### Dependencies
```bash
npm install
```

### Dev-Mode (Auto-Reload)
```bash
npm run dev
```

### Passwort zurücksetzen
```bash
node scripts/reset-password.js
```

## 📊 Datenbank-Schema

### MSSQL (tbl_Mitglied)
- MitgliedID (Primary Key)
- Vorname, Nachname
- Email
- Geloescht (0/1)
- Gruppen_Nr

### SQLite

**sessions**
```
token, email, memberId, abteilungId, expiresAt, createdAt, lastSeenAt
```

**credentials**
```
email, passwordHash, salt, iterations, updatedAt
```

**password_reset_tokens**
```
token, email, expiresAt, createdAt
```

## 🔄 Automatische Bereinigung

- Sessions: Nach SESSION_DAYS automatisch gelöscht
- Reset-Tokens: Verfallen nach 24 Stunden
- Cleanup-Job: Läuft alle 5 Minuten

## 📝 Logging

Debug-Infos nur in `NODE_ENV=development`.

Für Production empfohlen:
- `pm2 logs spg-portal`
- Sentry oder ähnlicher Error Tracking Service

## 📄 Lizenz

Privat - Nur für KG Wispelten

## 👥 Support

Bei Fragen:
1. Debug-Seite: http://localhost:3000/debug.html
2. .env überprüfen
3. Server-Logs: `pm2 logs`
4. README & .env.example nochmal lesen

---

**Zuletzt aktualisiert:** Januar 2026  
**Version:** 1.0.0  
**Status:** ✅ Produktionsreif
