import { validateSession, isAdminEmail } from "../services/authService.js";

export async function requireSession(req, res, next) {
  try {
    // Token aus Cookie oder Header holen
    const token = req.cookies?.spg_session || 
                  req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }
    
    // Session validieren
    const session = await validateSession(token);
    
    if (!session) {
      return res.status(401).json({ error: "Session ungültig oder abgelaufen" });
    }
    
    // User-Daten an Request anhängen
    req.user = {
      email: session.email,
      memberId: session.memberId,
      abteilungId: session.abteilungId,
      token: session.token
    };
    
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    // Erst normale Session-Prüfung
    await requireSession(req, res, async () => {
      try {
        // Dann Admin-Check
        const isAdmin = await isAdminEmail(req.user.email);
        
        if (!isAdmin) {
          return res.status(403).json({ error: "Keine Admin-Berechtigung" });
        }
        
        req.user.isAdmin = true;
        next();
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

export function optionalSession(req, res, next) {
  requireSession(req, res, (err) => {
    // Bei Fehler trotzdem weitermachen
    if (err) {
      req.user = null;
    }
    next();
  });
}