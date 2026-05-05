import { ZapIcon, DatabaseIcon, LayersIcon, FileTextIcon, CloudIcon, CodeIcon } from "lucide-react";

const features = [
  {
    icon: ZapIcon,
    title: "Real-time Streaming",
    description: "Fast AI responses with SSE streaming for a smoother experience",
  },
  {
    icon: DatabaseIcon,
    title: "Chat History",
    description: "Chat history automatically saved, easily accessible anytime",
  },
  {
    icon: LayersIcon,
    title: "Multiple Models",
    description: "Support for multiple AI models from NVIDIA NIM for different needs",
  },
  {
    icon: FileTextIcon,
    title: "PDF Extraction",
    description: "Upload and analyze PDF documents with advanced AI capabilities",
  },
  {
    icon: CloudIcon,
    title: "Cloudflare Deployment",
    description: "Deploy easily on Cloudflare Workers for global performance",
  },
  {
    icon: CodeIcon,
    title: "Modern Stack",
    description: "Built with Next.js 15, TypeScript, and Tailwind CSS v4",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-[#030712]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Key Features
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to interact with AI effectively
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 hover:border-blue-500/50 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
