import { MessageCircleIcon, SparklesIcon, CheckCircleIcon } from "lucide-react";

const steps = [
  {
    icon: MessageCircleIcon,
    number: "01",
    title: "Mulai Chat",
    description: "Klik tombol Mulai Chat untuk membuka interface percakapan",
  },
  {
    icon: SparklesIcon,
    number: "02",
    title: "Ajukan Pertanyaan",
    description: "Tulis pertanyaan atau perintah Anda, AI akan memproses secara real-time",
  },
  {
    icon: CheckCircleIcon,
    number: "03",
    title: "Dapatkan Jawaban",
    description: "Terima respons yang akurat dan terstruktur dengan sumber referensi",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Cara Menggunakan
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Mudah digunakan, hanya 3 langkah untuk mulai
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent -translate-y-1/2" />
              )}

              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
