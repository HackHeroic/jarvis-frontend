import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import FeatureBento from "@/components/landing/FeatureBento";
import Philosophy from "@/components/landing/Philosophy";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-[#1C1A17]">
      <LandingNav />
      <Hero />
      <FeatureBento />
      <Philosophy />
      <Pricing />
      <Footer />
    </div>
  );
}
