import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { Coffee, Utensils, Pizza, Moon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = [
    { id: 'breakfast', icon: Coffee, title: 'Breakfast', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { id: 'lunch', icon: Utensils, title: 'Lunch', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 'snacks', icon: Pizza, title: 'Snacks', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'dinner', icon: Moon, title: 'Dinner', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' }
];

export default function StudentMessMenu() {
    const [currentMenu, setCurrentMenu] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [todayStr, setTodayStr] = useState<string>('monday');

    useEffect(() => {
        // Detect current day
        const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday
        // Re-map so Monday is 0, Sunday is 6
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        setTodayStr(DAYS[adjustedIndex]);
        setExpandedDay(DAYS[adjustedIndex]);

        fetchCurrentMenu();
    }, []);

    const fetchCurrentMenu = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await apiRequest('/api/mess/current', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.menu) {
                setCurrentMenu(res.menu);
            }
        } catch (error) {
            console.error("Failed to load mess menu", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!currentMenu) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-2">Campus Mess Menu</h2>
                <p className="text-slate-400">The mess representative hasn't published the menu for this week yet. Check back later!</p>
            </div>
        );
    }

    const todayMeals = currentMenu[todayStr];

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            {/* Header / Today's Menu Highlight */}
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-6 border-b border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Utensils className="w-6 h-6 text-emerald-400" /> Today's Menu
                        </h2>
                        <p className="text-emerald-400/80 font-medium capitalize mt-1">Week of {currentMenu.weekStartDate}</p>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border border-emerald-500/30">
                        {todayStr}
                    </div>
                </div>

                {todayMeals ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {MEALS.map((meal) => {
                            const Icon = meal.icon;
                            const items = todayMeals[meal.id];
                            return (
                                <div key={meal.id} className={`${meal.bg} ${meal.border} border rounded-xl p-4 transition hover:-translate-y-1`}>
                                    <h3 className={`font-bold flex items-center gap-2 mb-2 ${meal.color}`}>
                                        <Icon className="w-4 h-4" /> {meal.title}
                                    </h3>
                                    <p className="text-white text-sm leading-relaxed">{items === 'Not Available' ? <span className="text-slate-500 italic">Not announced yet</span> : items}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-400">No data available for today.</p>
                )}
            </div>

            {/* Weekly Explorer */}
            <div className="p-6">
                <h3 className="text-lg font-bold text-slate-300 mb-4 px-2 tracking-wide uppercase text-sm">Full Week Menu</h3>
                <div className="space-y-3">
                    {DAYS.map((day) => {
                        const isExpanded = expandedDay === day;
                        const dayMeals = currentMenu[day];
                        const isToday = day === todayStr;

                        return (
                            <div key={day} className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-slate-600 bg-slate-800/80' : 'border-slate-700/50 bg-slate-900/50 hover:border-slate-600'}`}>
                                <button 
                                    className="w-full px-6 py-4 flex items-center justify-between"
                                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                                >
                                    <span className={`font-bold capitalize text-lg ${isToday ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {day} {isToday && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-2 align-middle border border-emerald-500/30">TODAY</span>}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </button>
                                
                                {isExpanded && dayMeals && (
                                    <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                        {MEALS.map((meal) => (
                                            <div key={meal.id} className="flex flex-col">
                                                <span className={`text-xs uppercase font-bold tracking-wider mb-1 ${meal.color}`}>{meal.title}</span>
                                                <p className="text-slate-300 text-sm bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700/50">{dayMeals[meal.id] === 'Not Available' ? <span className="text-slate-600 italic">Not set</span> : dayMeals[meal.id]}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
