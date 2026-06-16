import { redirect } from "next/navigation";

/** Legacy dev spike route — redirects to the product dashboard. */
export default function SpikePage() {
  redirect("/dashboard");
}
