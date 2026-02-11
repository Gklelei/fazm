import React from "react";

const AppLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-linear-to-br from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]">
      {/* Football pitch pattern overlay */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px)
          `,
        }}
      >
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 border-[3px] border-white/20 rounded-full" />
        {/* Center line */}
        <div className="absolute top-0 left-1/2 w-0.75 h-full bg-white/15" />
      </div>

      {/* Floating particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300/70 rounded-full animate-float"
          style={{
            top: `${20 + i * 20}%`,
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center animate-fade-in-up">
        {/* Academy name */}
        <h1 className="text-5xl md:text-6xl font-black text-yellow-400 uppercase tracking-wider mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          FAZAM
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold text-white uppercase tracking-[0.25em] mb-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          Football Academy
        </h2>

        {/* Loading bar */}
        <div className="w-75 md:w-100 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-linear-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-full animate-loading bg-size-[200%_100%]" />
        </div>

        <p className="text-yellow-100 text-sm mt-4 tracking-wider animate-pulse-slow">
          Loading your experience...
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loading {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          50% {
            transform: translateY(-30px) translateX(10px);
            opacity: 1;
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 1.5s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-loading {
          animation: loading 2s ease-in-out infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AppLoader;
