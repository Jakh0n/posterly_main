import { Router } from "express";
import multer from "multer";

import { extractBrand, uploadLogo } from "../controllers/brand.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post("/extract", extractBrand);
router.post("/logo", upload.single("logo"), uploadLogo);

export { router as brandRouter };
