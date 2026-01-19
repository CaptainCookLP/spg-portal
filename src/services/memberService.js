import { getPool } from "../db/mssql.js";
import { AppError } from "../middleware/errorHandler.js";
import { maskIban, maskBic } from "../utils/formatters.js";
import { verifyPassword } from "../utils/crypto.js";
import { sqliteGet } from "../db/sqlite.js";

export async function getMembersByEmail(email) {
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT
        m.MitgliedID,
        m.Anrede, m.Titel, m.Vorname, m.Nachname,
        m.Geburtsdatum,
        m.Strasse AS Adresse,
        m.PLZ, m.Ort, m.Land,
        m.Telefon_Privat, m.Telefon_Dienstlich, m.Handy_1, m.Handy_2,
        m.Email,
        m.Eintritt_Datum, m.Austritt_Datum,
        m.Gruppen_Nr,
        a.AbteilungBezeichnung AS Abteilung,
        m.Einmalbetrag_1,
        m.BIC_Nr,
        m.IBAN_Nr,
        m.Sepa_Mandats_Ref,
        m.Sepa_Datum_Mandats_Ref,
        m.Extern,
        m.DSGVOZugestimmt,
        m.DSGVOZugestimmtAm
      FROM dbo.tbl_Mitglied m
      LEFT JOIN dbo.tbl_Abteilung a
        ON a.AbteilungID = TRY_CONVERT(int, m.Gruppen_Nr) AND a.Geloescht = 0
      WHERE m.Email = @email AND m.Geloescht = 0
      ORDER BY m.Nachname, m.Vorname
    `);
  
  const members = result.recordset || [];
  
  // Map zu Frontend-Feldnamen (lowercase)
  return members.map(m => ({
    id: String(m.MitgliedID),
    anrede: m.Anrede || "",
    titel: m.Titel || "",
    vorname: m.Vorname || "",
    nachname: m.Nachname || "",
    geburtsdatum: m.Geburtsdatum || null,
    strasse: m.Adresse || "",
    plz: m.PLZ || "",
    ort: m.Ort || "",
    land: m.Land || "",
    telPriv: m.Telefon_Privat || "",
    telDienst: m.Telefon_Dienstlich || "",
    handy1: m.Handy_1 || "",
    handy2: m.Handy_2 || "",
    email: m.Email || "",
    eintritt: m.Eintritt_Datum || null,
    austritt: m.Austritt_Datum || null,
    abteilung: m.Abteilung || "",
    beitrag: m.Einmalbetrag_1 || "",
    mandatRef: m.Sepa_Mandats_Ref || "",
    mandatDatum: m.Sepa_Datum_Mandats_Ref || null,
    extern: m.Extern,
    dsgvo: !!m.DSGVOZugestimmt,
    dsgvoDatum: m.DSGVOZugestimmtAm || null,
    iban: m.IBAN_Nr || "",
    bic: m.BIC_Nr || ""
  }));
}

export async function updateDsgvoConsent(email, memberIds) {
  const pool = await getPool();
  
  // Erst validieren: Gehören alle IDs zur Email?
  const verifyResult = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT MitgliedID
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
    `);
  
  const allowedIds = new Set(
    (verifyResult.recordset || []).map(r => String(r.MitgliedID))
  );
  
  const validIds = memberIds.filter(id => allowedIds.has(String(id)));
  
  if (validIds.length === 0) {
    throw new AppError("Keine gültigen Mitglieder ausgewählt", 400);
  }
  
  // Update durchführen
  const params = validIds.map((_, i) => `@id${i}`).join(", ");
  const request = pool.request().input("email", email);
  
  validIds.forEach((id, i) => {
    request.input(`id${i}`, String(id));
  });
  
  await request.query(`
    UPDATE dbo.tbl_Mitglied
    SET
      DSGVOZugestimmt = 1,
      DSGVOZugestimmtAm = SYSUTCDATETIME()
    WHERE Email = @email
      AND MitgliedID IN (${params})
      AND Geloescht = 0
  `);
  
  return validIds.length;
}

export async function getBankDataMasked(email) {
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT TOP 1 BIC_Nr, IBAN_Nr, Sepa_Mandats_Ref
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
      ORDER BY MitgliedID
    `);
  
  const row = result.recordset?.[0] || {};
  
  return {
    bicMasked: maskBic(row.BIC_Nr),
    ibanMasked: maskIban(row.IBAN_Nr),
    mandatRef: String(row.Sepa_Mandats_Ref || "")
  };
}

export async function getBankDataFull(email, password) {
  // Passwort prüfen
  const credential = await sqliteGet(
    "SELECT * FROM credentials WHERE email = ?",
    [email.toLowerCase()]
  );
  
  if (!credential) {
    throw new AppError("Bitte zuerst Passwort setzen", 403);
  }
  
  const isValid = verifyPassword(password, {
    hash: credential.passwordHash,
    salt: credential.salt,
    iterations: credential.iterations
  });
  
  if (!isValid) {
    throw new AppError("Falsches Passwort", 403);
  }
  
  // Daten holen
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("email", email)
    .query(`
      SELECT TOP 1 BIC_Nr, IBAN_Nr, Sepa_Mandats_Ref
      FROM dbo.tbl_Mitglied
      WHERE Email = @email AND Geloescht = 0
      ORDER BY MitgliedID
    `);
  
  const row = result.recordset?.[0] || {};
  
  return {
    bic: String(row.BIC_Nr || ""),
    iban: String(row.IBAN_Nr || ""),
    mandatRef: String(row.Sepa_Mandats_Ref || "")
  };
}

export async function searchMembers(query) {
  const pool = await getPool();
  
  const result = await pool
    .request()
    .input("q", `%${query}%`)
    .query(`
      SELECT TOP 50 
        MitgliedID, 
        Vorname, 
        Nachname, 
        Email
      FROM dbo.tbl_Mitglied
      WHERE Geloescht = 0
        AND (
          MitgliedID LIKE @q OR
          Vorname LIKE @q OR
          Nachname LIKE @q OR
          Email LIKE @q
        )
      ORDER BY Nachname, Vorname
    `);
  
  return result.recordset || [];
}