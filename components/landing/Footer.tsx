export default function Footer() {
  return (
    <footer className="bg-[#211F1C] py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#D97859] flex items-center justify-center text-[#292724] font-extrabold text-xs">
            J
          </div>
          <span className="text-[#FFFFFF] font-semibold text-sm">Jarvis</span>
        </div>
        <p className="text-[#FFFFFF]/60 text-xs">
          Built with 🧠 by Madhav
        </p>
      </div>
    </footer>
  );
}
