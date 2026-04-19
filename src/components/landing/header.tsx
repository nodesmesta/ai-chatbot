import Image from "next/image";
import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/nodesemesta.png"
              alt="Nodesemesta Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg hidden sm:block">
              Chatbot AI
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/chat"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Chat
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
