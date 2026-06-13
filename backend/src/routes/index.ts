import { Router } from "express";

import { brandRouter } from "./brand.route";
import { healthRouter } from "./health.route";
import { spikeRouter } from "./spike.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/spike", spikeRouter);
router.use("/brand", brandRouter);

export { router as apiRouter };
