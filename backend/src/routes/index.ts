import { Router } from "express";

import { brandRouter } from "./brand.route";
import { campaignsRouter } from "./campaigns.route";
import { healthRouter } from "./health.route";
import { jobsRouter } from "./jobs.route";
import { spikeRouter } from "./spike.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/spike", spikeRouter);
router.use("/brand", brandRouter);
router.use("/campaigns", campaignsRouter);
router.use("/jobs", jobsRouter);

export { router as apiRouter };
