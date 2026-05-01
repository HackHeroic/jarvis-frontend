import JarvisLogo from "./JarvisLogo";

export default function Footer() {
  return (
    <footer className="bg-[#0F0D0A] py-14">
      <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center gap-5">
        <JarvisLogo size="sm" wordmark={true} animated />
        <p className="text-[#FAF8F4]/45 text-[13px] font-light italic">
          Built by a student. Designed for one.
        </p>
        <p className="font-mono text-[10px] tracking-[1.5px] text-[#FAF8F4]/30 uppercase">
          © 2026 jarvis &nbsp;·&nbsp; privacy &nbsp;·&nbsp; terms &nbsp;·&nbsp; contact
        </p>
      </div>
    </footer>
  );
}
