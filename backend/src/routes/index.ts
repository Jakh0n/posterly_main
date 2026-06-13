import { Router } from "express";

import { healthRouter } from "./health.route";
import { spikeRouter } from "./spike.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/spike", spikeRouter);

export { router as apiRouter };
