import {
  CallToAction,
  Features,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
} from "@/components/marketing";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
