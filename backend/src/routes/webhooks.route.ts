import express, { Router } from "express";

import { handlePolarWebhook } from "../controllers/webhooks.controller";

const router = Router();

// Raw body is required so the Polar signature can be verified. This router is
// mounted before the global express.json() so the payload stays unparsed.
router.post(
  "/polar",
  express.raw({ type: "application/json" }),
  handlePolarWebhook,
);

export { router as webhooksRouter };
