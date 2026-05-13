import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Preview from "@/components/landing/Preview";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-brand-charcoal text-brand-ivory">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Preview />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
