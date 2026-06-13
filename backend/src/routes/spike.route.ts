import { Router } from "express";
import multer from "multer";

import { spikeHandler } from "../controllers/spike.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const router = Router();

router.post("/", upload.single("photo"), spikeHandler);

export { router as spikeRouter };
