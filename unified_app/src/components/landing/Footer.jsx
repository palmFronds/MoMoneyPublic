import React from 'react';

const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-[#00ffe7]/20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <div className="mb-6 md:mb-0">
            <div className="text-2xl font-bold text-[#00ffe7] mb-2">
              MoMoney
            </div>
            <p className="text-cyan-300 text-sm">
              Learn investing. Game on.
            </p>
          </div>

          {/* Links */}
          <div className="flex space-x-8">
            <a 
              href="#" 
              className="text-cyan-300 hover:text-[#00ffe7] transition-colors duration-300"
            >
              Terms
            </a>
            <a 
              href="#" 
              className="text-cyan-300 hover:text-[#00ffe7] transition-colors duration-300"
            >
              Privacy
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-[#00ffe7]/20 text-center">
          <p className="text-cyan-300 text-sm">
            © 2025 MoMoney. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 