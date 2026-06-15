import { Router } from "express";

import {
  createBillingCheckout,
  listBillingPacks,
} from "../controllers/billing.controller";

const router = Router();

router.get("/packs", listBillingPacks);
router.post("/checkout", createBillingCheckout);

export { router as billingRouter };
