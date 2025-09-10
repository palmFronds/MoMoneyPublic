import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "Choose a learning path",
      description: "Select your experience level and investment goals to get started."
    },
    {
      number: "02",
      title: "Simulate and practice investing",
      description: "Use real market data to practice trading without risk."
    },
    {
      number: "03",
      title: "Earn XP and improve your strategy",
      description: "Level up through quizzes and track your progress over time."
    }
  ];

  return (
    <section className="py-20 px-4 bg-[#23272f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffe7] mb-6">
            How It Works
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-[#181a20] border-2 border-[#00ffe7]/30 rounded-lg p-8 text-center
                           hover:border-[#00ffe7] hover:shadow-[0_0_20px_#00ffe7/30] transition-all duration-300">
                {/* Step number */}
                <div className="text-6xl font-bold text-[#00ffe7]/30 mb-4">
                  {step.number}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-[#00ffe7] mb-4">
                  {step.title}
                </h3>
                
                {/* Description */}
                <p className="text-cyan-300 leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {/* Arrow for mobile */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center mt-8">
                  <div className="text-[#00ffe7] text-2xl">↓</div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Connecting lines for desktop */}
        <div className="hidden md:block relative mt-8">
          <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#00ffe7]/50 to-[#00ffe7]/50 transform -translate-y-1/2"></div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks; 