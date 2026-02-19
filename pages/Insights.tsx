import React from 'react';

const Insights: React.FC = () => {
  const insights = [
    {
      category: "Circadian Rhythm",
      icon: "vital_signs",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      title: "Mastering Your Master Clock",
      content: "Your suprachiasmatic nucleus (SCN) is reset by light entering the eyes. Viewing bright light (ideally sunlight) for 10-30 minutes immediately after waking helps anchor your cortisol peak, ensuring alertness now and melatonin release 12-14 hours later."
    },
    {
      category: "Solar Health",
      icon: "wb_sunny",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      title: "The Vitamin D Window",
      content: "Vitamin D is only synthesized when the sun is above 45° in the sky (usually 10 AM - 2 PM). Morning sun signals wakefulness, but noon sun builds immunity. Short, intense exposure around solar noon is most efficient for Vitamin D production."
    },
    {
      category: "Magnetism",
      icon: "explore",
      color: "text-red-400",
      bg: "bg-red-500/10",
      title: "Geomagnetic Influence",
      content: "Human biology contains magnetite crystals. Fluctuations in Earth's magnetic field (K-index > 4) can correlate with reduced Heart Rate Variability (HRV) and increased anxiety. During solar storms, prioritize grounding and stress reduction."
    },
    {
      category: "Water & Moon",
      icon: "water_drop",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      title: "Lunar Biological Tides",
      content: "The human body is ~60% water. While controversial, some studies suggest lunar phases impact sleep latency (time to fall asleep) and deep sleep duration. Hydration needs may increase during the full moon due to subtle gravitational shifts."
    },
    {
      category: "Blue Light",
      icon: "visibility_off",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      title: "Digital Sunset",
      content: "Artificial blue light after sunset suppresses melatonin production twice as much as other wavelengths. Implementing a 'digital sunset'—avoiding screens 1-2 hours before bed—is the single most effective habit for sleep quality."
    }
  ];

  return (
    <div className="min-h-full bg-gradient-to-b from-[#1a160c] to-[#000000] text-slate-100 flex flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h2 className="text-white/60 text-xs font-medium tracking-wider uppercase mb-1">Knowledge Base</h2>
        <h1 className="text-white text-2xl font-bold tracking-tight">Daily Insights</h1>
      </div>

      <div className="flex-1 px-4 space-y-4">
        {insights.map((item, index) => (
          <div key={index} className="bg-[#2d2616]/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col gap-3 hover:bg-[#2d2616] transition-colors">
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center ${item.color}`}>
                 <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${item.color}`}>{item.category}</span>
            </div>
            
            <div>
               <h3 className="text-white font-bold text-lg leading-tight mb-2">{item.title}</h3>
               <p className="text-white/70 text-sm leading-relaxed">{item.content}</p>
            </div>
          </div>
        ))}
        
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mt-6 mx-2">
            <div className="flex items-center gap-2 mb-2 text-primary">
                <span className="material-symbols-outlined">auto_stories</span>
                <span className="text-sm font-bold uppercase">Did you know?</span>
            </div>
            <p className="text-primary/90 text-sm italic leading-relaxed">
                "Circadian" comes from the Latin "circa" (about) and "dies" (day), meaning "about a day".
            </p>
        </div>
      </div>
    </div>
  );
};

export default Insights;