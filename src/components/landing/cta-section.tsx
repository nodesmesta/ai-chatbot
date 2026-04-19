import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-900/30 via-[#030712] to-purple-900/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Siap untuk Mulai?
        </h2>
        <p className="text-gray-400 text-lg mb-8">
          Mulai interaksi dengan AI sekarang dan rasakan pengalaman chat yang berbeda
        </p>
        <Link
          href="/chat"
          className="inline-block rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 text-lg transition-colors"
        >
          Mulai Chat Sekarang
        </Link>
      </div>
    </section>
  );
}
