import React from 'react';

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-4xl mx-auto">
        {/* Main headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 text-[#00ffe7] leading-tight">
          Learn Investing.
          <span className="block text-cyan-400">Game On.</span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl lg:text-2xl mb-12 text-cyan-300 max-w-3xl mx-auto leading-relaxed">
          Gamified investing lessons using real data & simulations.
        </p>
        
        {/* CTA Button */}
        <button className="px-8 py-4 bg-[#00ffe7] text-[#181a20] font-bold text-lg rounded-lg 
                         hover:shadow-[0_0_20px_#00ffe7] transition-all duration-300 transform hover:scale-105
                         border-2 border-[#00ffe7]">
          Join the Waitlist
        </button>
        
        {/* Glowing mascot placeholder */}
        <div className="mt-16 flex justify-center">
          <div className="w-24 h-24 bg-[#00ffe7]/20 rounded-full border-2 border-[#00ffe7] flex items-center justify-center
                        shadow-[0_0_20px_#00ffe7/30] animate-pulse">
            <span className="text-4xl">💰</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 