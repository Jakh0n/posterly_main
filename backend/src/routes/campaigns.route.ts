import { Router } from "express";
import multer from "multer";

import { uploadProductPhoto } from "../controllers/campaigns.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const router = Router();

router.post("/upload", upload.single("photo"), uploadProductPhoto);

export { router as campaignsRouter };
