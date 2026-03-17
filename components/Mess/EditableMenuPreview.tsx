import React, { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit3, Loader2 } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

interface EditableMenuPreviewProps {
    initialData: any;
    initialDate: string;
    onSaveComplete: () => void;
}

export default function EditableMenuPreview({ initialData, initialDate, onSaveComplete }: EditableMenuPreviewProps) {
    const [menuData, setMenuData] = useState<any>(initialData || {});
    const [weekStart, setWeekStart] = useState(initialDate || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleCellChange = (day: string, meal: string, value: string) => {
        setMenuData((prev: any) => ({
            ...prev,
            [day]: {
                ...(prev[day] || {}),
                [meal]: value
            }
        }));
    };

    const confirmAndSave = async () => {
        if (!weekStart) {
            toast({ title: 'Missing Date', description: 'Please specify the starting Monday for this menu week.', variant: 'destructive' });
            return;
        }

        try {
            setIsSaving(true);
            const token = localStorage.getItem('authToken');
            
            await apiRequest('/api/mess/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    weekStartDate: weekStart,
                    menuData
                })
            });

            toast({ title: 'Menu Published!', description: 'The official mess menu has been updated for the students.' });
            onSaveComplete();
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ title: 'Failed to Save', description: error.message || 'Network error.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-800 p-6 flex justify-between items-center flex-wrap gap-4 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Edit AI Output</h3>
                        <p className="text-sm text-slate-400">Correct any OCR mistakes manually before publishing.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-300 font-medium whitespace-nowrap">Week Start (Monday):</span>
                        <input 
                            type="date" 
                            className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                            value={weekStart}
                            onChange={(e) => setWeekStart(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={confirmAndSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirm & Save
                    </button>
                </div>
            </div>

            <div className="p-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-300 uppercase text-xs font-bold tracking-wider">
                            <th className="p-4 rounded-tl-xl border-b border-r border-slate-700 w-32">Day</th>
                            {MEALS.map(m => (
                                <th key={m} className="p-4 border-b border-r border-slate-700 w-1/4">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {DAYS.map((day) => (
                            <tr key={day} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition">
                                <td className="p-4 border-r border-slate-700/50 font-bold text-slate-200 capitalize bg-slate-800/20">
                                    {day}
                                </td>
                                {MEALS.map(meal => {
                                    const val = menuData[day]?.[meal] || 'Not Available';
                                    const isMissing = val === 'Not Available';
                                    
                                    return (
                                        <td key={`${day}-${meal}`} className="p-2 border-r border-slate-700/50 align-top">
                                            <textarea 
                                                className={`w-full bg-transparent resize-none h-20 outline-none p-2 rounded-lg transition overflow-y-auto ${isMissing ? 'text-slate-500 italic' : 'text-slate-300'} hover:bg-slate-800 focus:bg-slate-900 focus:ring-1 focus:ring-blue-500`}
                                                value={val}
                                                onChange={(e) => handleCellChange(day, meal, e.target.value)}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
