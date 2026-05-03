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
import BootSequence from "@/components/landing/BootSequence";
import SystemFeed from "@/components/landing/SystemFeed";
import CursorCompanion from "@/components/landing/CursorCompanion";

export default function Home() {
  return (
    <div className="bg-[#1C1A17] relative">
      {/* page-wide film grain — fixed layer over everything except the nav */}
      <div className="landing-grain" aria-hidden="true" />

      {/* boot intro, runs once per session, fades to landing */}
      <BootSequence />

      {/* persistent system feed (bottom-right) */}
      <SystemFeed />

      {/* cursor companion (desktop only, no reduced-motion) */}
      <CursorCompanion />

      <LandingNav />
      <HeroLivingPlan />
      <div className="section-divider" />
      <ProblemNotice />
      <div className="section-divider" />
      <ThreeLevels />
      <div className="section-divider" />
      <EngineScience />
      <div className="section-divider" />
      <AmbientIntelligence />
      <div className="section-divider" />
      <Capabilities />
      <div className="section-divider" />
      <BrainDumpDemo />
      <div className="section-divider" />
      <Compounding />
      <div className="section-divider" />
      <VisionClose />
      <div className="section-divider" />
      <Pricing />
      <Footer />
    </div>
  );
}
