import React from 'react';

const Features = () => {
  const features = [
    {
      icon: "📈",
      title: "Real-Time Simulations",
      description: "Practice with live market data in a risk-free environment."
    },
    {
      icon: "🧠",
      title: "Quiz & XP Progression",
      description: "Level up your knowledge through interactive quizzes and earn XP."
    },
    {
      icon: "📊",
      title: "Track Your Learning + Portfolio",
      description: "Monitor both your simulated portfolio and learning progress."
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffe7] mb-6">
            Why MoMoney?
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-[#23272f] border-2 border-[#00ffe7]/30 rounded-lg p-8 text-center
                       hover:border-[#00ffe7] hover:shadow-[0_0_20px_#00ffe7/30] transition-all duration-300
                       transform hover:-translate-y-2"
            >
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-[#00ffe7] mb-4">
                {feature.title}
              </h3>
              <p className="text-cyan-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features; 