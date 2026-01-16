import { body, param, query, validationResult } from "express-validator";
import { AppError } from "./errorHandler.js";

export function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    throw new AppError(
      "Validierungsfehler",
      400,
      errors.array().map(e => ({ field: e.param, message: e.msg }))
    );
  }
  
  next();
}

// Login Validation
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Ungültige E-Mail-Adresse"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Passwort muss mindestens 8 Zeichen haben"),
  validate
];

// Password Change Validation
export const validatePasswordChange = [
  body("oldPassword")
    .notEmpty()
    .withMessage("Altes Passwort erforderlich"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Neues Passwort muss mindestens 8 Zeichen haben"),
  validate
];

// Email Validation
export const validateEmail = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Ungültige E-Mail-Adresse"),
  validate
];

// ID Validation
export const validateId = [
  param("id")
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Ungültige ID"),
  validate
];

// Notification Creation
export const validateNotification = [
  body("title")
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Titel erforderlich (max. 200 Zeichen)"),
  body("bodyText")
    .optional()
    .isLength({ max: 10000 })
    .withMessage("Text zu lang (max. 10.000 Zeichen)"),
  body("bodyHtml")
    .optional()
    .isLength({ max: 50000 })
    .withMessage("HTML zu lang"),
  body("targetsJson")
    .notEmpty()
    .isJSON()
    .withMessage("Targets müssen JSON sein"),
  validate
];

// Event Creation
export const validateEvent = [
  body("title")
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Titel erforderlich"),
  body("startsAt")
    .isISO8601()
    .withMessage("Ungültiges Datum"),
  body("location")
    .optional()
    .isLength({ max: 500 }),
  body("description")
    .optional()
    .isLength({ max: 5000 }),
  validate
];