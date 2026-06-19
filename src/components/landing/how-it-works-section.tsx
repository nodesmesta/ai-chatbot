import { MessageCircleIcon, SparklesIcon, CheckCircleIcon } from "lucide-react";

const steps = [
  {
    icon: MessageCircleIcon,
    number: "01",
    title: "Start Chatting",
    description: "Click the Start Chatting button to open the chat interface",
  },
  {
    icon: SparklesIcon,
    number: "02",
    title: "Ask Questions",
    description: "Type your questions or commands, AI will process them in real-time",
  },
  {
    icon: CheckCircleIcon,
    number: "03",
    title: "Get Answers",
    description: "Receive accurate and structured responses with reference sources",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How to Use
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Easy to use, just 3 steps to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-blue-500/30" />
              )}

              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
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
