import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030712] pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6">
          Chatbot AI
        </h1>
        <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-10">
          Powered by Nodesemesta
        </p>

        <div className="flex justify-center">
          <Link
            href="/chat"
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 text-lg transition-colors"
          >
            Mulai Chat
          </Link>
        </div>
      </div>
    </section>
  );
}
