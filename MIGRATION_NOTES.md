# Migration zu Multi-Page Architecture

## 🎯 Abgeschlossen

Diese Anwendung wurde erfolgreich von einer Single Page Application (SPA) zu einer sauberen Multi-Page Architecture mit Server-seitigem Template-Rendering umstrukturiert.

---

## 📁 Neue Struktur

### Server-seitige Seiten
```
/                    → Login-Seite (öffentlich)
/profil              → Profilbearbeitung (geschützt)
/benachrichtigungen  → Benachrichtigungsverwaltung (geschützt)
/passwort            → Passwortänderung (geschützt)
/admin               → Admin-Panel (nur für Admins)
/events              → Event-Anzeige (geschützt)
/reset-password      → Passwort-Reset via Email-Link (öffentlich)
```

### Frontend-Dateien
```
public/pages/
├── login.html                    # Login-Seite Template
├── login.js                      # Login-Logik
├── profil.html                   # Profil-Template
├── profil.js                     # Profil-Logik
├── benachrichtigungen.html       # Benachrichtigungen-Template
├── benachrichtigungen.js         # Benachrichtigungen-Logik
├── passwort.html                 # Passwort-Ändern-Template
├── passwort.js                   # Passwort-Logik
├── admin.html                    # Admin-Template
├── admin.js                      # Admin-Logik
├── events.html                   # Events-Template
├── events.js                     # Events-Logik
├── reset-password.html           # Passwort-Reset-Template
├── layout-header.html            # Freigegebenes Header-Template
└── layout-footer.html            # Freigegebenes Footer-Template

public/shared/
├── utils.js                      # DOM-Helfer, Toast, Formatters
├── api.js                        # API-Client mit Error-Handling
└── auth.js                       # Session-Verwaltung
```

---

## 🔐 Authentifizierung & Sicherheit

### Session-Management
- **Cookie-basiert**: `spg_session` Cookie mit Token
- **Länge**: 30 Tage (konfigurierbar mit `SESSION_DAYS` in .env)
- **Flags**: `httpOnly`, `sameSite="lax"`, `secure` (bei HTTPS)
- **Middleware**: `requireAuthPage` schützt alle Seiten außer Login und Reset

### Passwort-Sicherheit
- **Hashing**: PBKDF2 mit 210.000 Iterationen
- **Trimming**: Alle Passwörter werden trimmed (Frontend + Backend)
- **Optional**: `REQUIRE_PASSWORD=false` in .env macht Passwort optional
- **Test-Email**: `TEST_EMAIL=...` in .env kann ohne Passwort verwendet werden

### Passwort-Reset
- **Token-basiert**: 32-Byte zufällige Tokens
- **Validität**: 24 Stunden
- **Sicher**: Tokens können nur einmal verwendet werden
- **Session-Revocation**: Alle Sessions werden bei Reset gelöscht

---

## 🚀 Neue Features in dieser Version

### Template-System (server.js)
```javascript
function renderTemplate(templatePath, data = {}) {
  let html = fs.readFileSync(templatePath, "utf-8");
  Object.keys(data).forEach(key => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), data[key] || "");
  });
  return html;
}
```

### Shared JavaScript Module
- **utils.js**: DOM-Helfer, Toast-Benachrichtigungen, Formatters
- **api.js**: Fetch-Wrapper mit automatischem JSON-Handling und Fehlerbehandlung
- **auth.js**: Session-Check, Einstellungen laden, Logout

### Middleware
- **requireAuthPage**: Authentifizierung für Seiten-Rendering
- **requireSession**: Authentifizierung für API-Endpoints
- **requireAdmin**: Admin-spezifische Authentifizierung

---

## 📝 Konfiguration (.env)

```dotenv
# Database
DB_TYPE=mssql
MSSQL_SERVER=
MSSQL_USER=
MSSQL_PASSWORD=
MSSQL_DATABASE=

# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Session
SESSION_DAYS=30

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Mitgliederportal
SMTP_FROM_EMAIL=noreply@example.com

# Admin
ADMIN_MEMBER_ID=0000000002

# Organization
ORG_NAME=Mitgliederportal
LOGO_URL=
DSGVO_URL=

# Testing
TEST_EMAIL=test@example.com
REQUIRE_PASSWORD=true
```

---

## 🔌 API-Endpoints

### Authentifizierung
- `POST /api/auth/login` - Anmelden
- `POST /api/auth/logout` - Abmelden
- `POST /api/auth/password/change` - Passwort ändern (geschützt)
- `POST /api/auth/password/forgot` - Passwort-Reset anfordern
- `GET /api/auth/password/reset/:token` - Token validieren
- `POST /api/auth/password/reset/:token` - Neues Passwort setzen

### Profil
- `GET /api/profile/family` - Familien-Daten laden
- `PUT /api/profile/member/:id` - Mitgliederdaten aktualisieren

### Benachrichtigungen
- `GET /api/notifications` - Alle Benachrichtigungen
- `PATCH /api/notifications/:id` - Benachrichtigung aktualisieren
- `DELETE /api/notifications/:id` - Benachrichtigung löschen

### Admin
- `GET /api/admin/settings` - Admin-Einstellungen laden
- `PUT /api/admin/settings` - Admin-Einstellungen speichern
- `PUT /api/admin/smtp` - SMTP-Konfiguration speichern
- `POST /api/admin/smtp/test` - SMTP-Test senden
- `POST /api/admin/notifications` - Benachrichtigung versenden

### Events
- `GET /api/events` - Alle Events
- `POST /api/events` - Neuen Event erstellen (Admin)
- `PUT /api/events/:id` - Event aktualisieren (Admin)
- `DELETE /api/events/:id` - Event löschen (Admin)

---

## 🧪 Testing & Entwicklung

### Entwicklung starten
```bash
npm install
npm run dev
```

### Test-Benutzer
Mit `TEST_EMAIL=test@example.com` in .env:
- Anmelden mit: `test@example.com` / beliebiges Passwort
- Kein Datenbankzugriff nötig für Testing

### Mit Optional-Password
Wenn `REQUIRE_PASSWORD=false` in .env:
- Anmelden mit: beliebige E-Mail / leeres Passwort
- Perfekt für Entwicklung ohne funktionierende SMTP

---

## 🔄 Migration von alter Struktur

### Alte Datei: `public/app.js` (Single Page App)
Diese Datei ist nicht mehr nötig und kann gelöscht werden. Die Funktionalität wurde verteilt auf:
- `public/pages/*.js` - Für Seiten-spezifische Logik
- `public/shared/*.js` - Für gemeinsame Funktionalität

### Alte Datei: `public/index.html`
Diese wurde ersetzt durch:
- `public/pages/login.html` - Login-Seite (Startseite)
- Andere `public/pages/*.html` - Für andere Seiten

---

## 📊 Architektur-Überblick

```
Browser Request
    ↓
Express Route (GET /profil, etc.)
    ↓
requireAuthPage Middleware (Session-Check)
    ↓
renderTemplate(html, data) - {{PLACEHOLDERS}} ersetzen
    ↓
HTML zurück an Browser
    ↓
JavaScript lädt (shared/utils, shared/api, shared/auth)
    ↓
JS macht API-Calls zu /api/* Endpoints
    ↓
API-Endpoints nutzen Middleware (requireSession, validatePasswordChange, etc.)
    ↓
Services (authService, profileService, etc.) handhaben Geschäftslogik
    ↓
Database-Layer (sqlite3, mssql)
```

---

## ✅ Checkliste für ersten Start

- [ ] `.env` mit Datenbank-Einstellungen konfigurieren
- [ ] `npm install` ausführen
- [ ] `npm run dev` für Entwicklung starten
- [ ] Zu `http://localhost:3000` navigieren
- [ ] Mit Test-Email anmelden (falls `TEST_EMAIL` in .env)
- [ ] Verschiedene Seiten überprüfen

---

## 🐛 Häufige Probleme & Lösungen

### "Session ungültig oder abgelaufen"
→ Browser-Cookies leeren oder SESSION_DAYS erhöhen

### "Passwort wird nicht akzeptiert"
→ Stellen Sie sicher, dass `REQUIRE_PASSWORD=true` in .env
→ Oder nutzen Sie TEST_EMAIL für Tests

### "E-Mail wird nicht versendet"
→ SMTP-Einstellungen in .env überprüfen
→ Mit `POST /api/admin/smtp/test` testen

### "Admin-Panel zeigt sich nicht"
→ Überprüfen Sie `ADMIN_MEMBER_ID` in .env
→ Überprüfen Sie, dass Mitglied als Admin markiert ist

---

## 📚 Weiterführende Dokumentation

- [Express.js Docs](https://expressjs.com/)
- [SQLite3 Docs](https://github.com/mapbox/node-sqlite3)
- [Nodemailer Docs](https://nodemailer.com/)
- [express-validator Docs](https://express-validator.github.io/docs/)
