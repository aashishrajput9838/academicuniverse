import React from 'react';

interface Mood {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const moods: Mood[] = [
  { id: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-400' },
  { id: 'neutral', label: 'Normal', emoji: '😐', color: 'bg-blue-400' },
  { id: 'stressed', label: 'Stressed', emoji: '😰', color: 'bg-orange-400' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😫', color: 'bg-red-500' },
];

interface MoodSelectorProps {
  selectedMood: string;
  onSelect: (moodId: string) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onSelect }) => {
  return (
    <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
      <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
        <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
        How are you feeling today?
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {moods.map((mood) => (
          <button
            key={mood.id}
            onClick={() => onSelect(mood.id)}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 border-2 ${
              selectedMood === mood.id
                ? `${mood.color} border-white shadow-lg scale-105 text-white font-bold`
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'
            }`}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="capitalize">{mood.label}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
        <p className="text-xs text-slate-400 leading-relaxed italic">
          "Your current mood helps me provide more personalized academic support."
        </p>
      </div>
    </div>
  );
};
