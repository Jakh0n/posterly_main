import { Router } from "express";

import { enqueueGeneration } from "../controllers/jobs.controller";

const router = Router();

router.post("/generate", enqueueGeneration);

export { router as jobsRouter };
