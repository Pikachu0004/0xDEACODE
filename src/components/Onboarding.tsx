import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Box, Zap, ArrowRight, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to VisiARise",
    description: "The world's first AI-driven platform to create, customize, and publish 3D models directly into Augmented Reality.",
    icon: Sparkles,
    color: "text-brand-primary",
    bg: "bg-brand-primary/10"
  },
  {
    title: "Text-to-3D Magic",
    description: "Simply describe your vision in the studio, and our AI engines will generate high-fidelity 3D models in seconds.",
    icon: Box,
    color: "text-brand-secondary",
    bg: "bg-brand-secondary/10"
  },
  {
    title: "Instant AR Publishing",
    description: "Project your creations into the real world with a single click. No apps required, just your web browser.",
    icon: Zap,
    color: "text-brand-accent",
    bg: "bg-brand-accent/10"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-12 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className={`w-20 h-20 mx-auto rounded-3xl ${step.bg} flex items-center justify-center`}>
                <step.icon className={`w-10 h-10 ${step.color}`} />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-display font-bold tracking-tight">{step.title}</h2>
                <p className="text-white/40 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex flex-col gap-6">
            <div className="flex justify-center gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-brand-primary' : 'w-2 bg-white/10'}`}
                />
              ))}
            </div>

            <button 
              onClick={handleNext}
              className="w-full py-5 bg-brand-primary text-white font-bold rounded-2xl hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-brand-primary/20"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
