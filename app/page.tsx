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
import EasterEggs from "@/components/landing/EasterEggs";
import SectionSeam from "@/components/landing/SectionSeam";
import LandingMinimap from "@/components/landing/LandingMinimap";

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

      {/* keyboard easter eggs (j ack toast, ? help overlay, / focus hero input) */}
      <EasterEggs />

      {/* skip-the-tour minimap (right edge, desktop only) */}
      <LandingMinimap />

      <LandingNav />
      <div id="hero"><HeroLivingPlan /></div>
      <SectionSeam />
      <div id="problem"><ProblemNotice /></div>
      <SectionSeam />
      <div id="tiers"><ThreeLevels /></div>
      <SectionSeam />
      <EngineScience />
      <SectionSeam />
      <div id="ambient"><AmbientIntelligence /></div>
      <SectionSeam />
      <Capabilities />
      <SectionSeam />
      <div id="demo"><BrainDumpDemo /></div>
      <SectionSeam />
      <div id="compound"><Compounding /></div>
      <SectionSeam />
      <div id="vision"><VisionClose /></div>
      <SectionSeam />
      <Pricing />
      <Footer />
    </div>
  );
}
