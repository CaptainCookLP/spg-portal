import express from "express";
import { getPublicSettings } from "../config/settings.js";

export const publicRouter = express.Router();

publicRouter.get("/settings", (req, res) => {
  res.json(getPublicSettings());
});

publicRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0"
  });
});