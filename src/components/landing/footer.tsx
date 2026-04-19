import Image from "next/image";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172a] border-t border-[#1e293b] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="text-center md:text-left flex items-center gap-4">
            <Image
              src="/nodesemesta.png"
              alt="Nodesemesta Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <div>
              <h3 className="text-white font-bold text-xl mb-1">Chatbot AI</h3>
              <p className="text-gray-400 text-sm">Powered by Nodesemesta</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-6">
            <a
              href="https://build.nvidia.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              NVIDIA NIM
            </a>
            <a
              href="https://developers.cloudflare.com/workers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Cloudflare Workers
            </a>
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Issues
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-[#1e293b] text-center">
          <p className="text-gray-500 text-sm">
            {currentYear} Chatbot AI. Powered by Nodesemesta.
          </p>
        </div>
      </div>
    </footer>
  );
}
