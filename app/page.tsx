import LandingNav from "@/components/landing/LandingNav";
import HeroLivingPlan from "@/components/landing/HeroLivingPlan";
import ProblemNotice from "@/components/landing/ProblemNotice";
import ThreeLevels from "@/components/landing/ThreeLevels";
import EngineScience from "@/components/landing/EngineScience";
import AmbientIntelligence from "@/components/landing/AmbientIntelligence";
import Capabilities from "@/components/landing/Capabilities";
import BrainDumpDemo from "@/components/landing/BrainDumpDemo";
import Compounding from "@/components/landing/Compounding";
import VisionClose from "@/components/landing/VisionClose";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-[#1C1A17]">
      <LandingNav />
      <HeroLivingPlan />
      <ProblemNotice />
      <ThreeLevels />
      <EngineScience />
      <AmbientIntelligence />
      <Capabilities />
      <BrainDumpDemo />
      <Compounding />
      <VisionClose />
      <Pricing />
      <Footer />
    </div>
  );
}
