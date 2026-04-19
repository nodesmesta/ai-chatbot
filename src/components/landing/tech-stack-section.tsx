const technologies = [
  { name: "Next.js 15", description: "App Router & RSC" },
  { name: "TypeScript", description: "Type Safety" },
  { name: "Tailwind CSS v4", description: "Modern Styling" },
  { name: "NVIDIA NIM", description: "AI Models" },
  { name: "Cloudflare Workers", description: "Edge Deployment" },
  { name: "Vectorize", description: "Vector Database" },
];

export function TechStackSection() {
  return (
    <section className="py-24 bg-[#030712]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Teknologi yang Digunakan
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Dibangun dengan teknologi modern dan terbaik di industri
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 text-center hover:border-blue-500/50 transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">
                {tech.name}
              </h3>
              <p className="text-gray-400 text-sm">
                {tech.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
