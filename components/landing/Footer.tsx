export default function Footer() {
  return (
    <footer className="bg-[#0F0D0A] py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#D4775A] flex items-center justify-center text-[#1C1A17] font-extrabold text-xs">
            J
          </div>
          <span className="text-[#FAF8F4] font-semibold text-sm">Jarvis</span>
        </div>
        <p className="text-[#FAF8F4]/30 text-xs">
          Built with 🧠 by Madhav
        </p>
      </div>
    </footer>
  );
}
