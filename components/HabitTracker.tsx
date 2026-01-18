import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Label } from './ui/Label';
import { Plus, Calendar, BarChart3, TrendingUp, Download, Upload, Sparkles, Smile, Frown, Meh, Zap, CloudRain, Trash2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultHabitEntries } from '../constants';
import { HabitEntry, Emotion } from '../types';
import { GoogleGenAI } from '@google/genai';
import { addHabitEntry as addHabitEntryFs, listenHabitEntries, deleteHabitEntry, listenCharacterProfile } from '../services/firestore';

interface HabitTrackerProps {
    uid: string;
}

const EMOTIONS: { value: Emotion; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "Happy", label: "Happy", icon: <Smile className="w-4 h-4" />, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
    { value: "Calm", label: "Calm", icon: <Meh className="w-4 h-4" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
    { value: "Excited", label: "Excited", icon: <Zap className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
    { value: "Tired", label: "Tired", icon: <CloudRain className="w-4 h-4" />, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
    { value: "Anxious", label: "Anxious", icon: <Frown className="w-4 h-4" />, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
    { value: "Frustrated", label: "Frustrated", icon: <Frown className="w-4 h-4" />, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
];

export const HabitTracker: React.FC<HabitTrackerProps> = ({ uid }) => {
    const [habitEntries, setHabitEntries] = useLocalStorage<HabitEntry[]>('habitTrackerData', defaultHabitEntries);
    const [trackerView, setTrackerView] = useState<'entry' | 'history' | 'analytics'>('entry');
    const [newEntry, setNewEntry] = useState<Partial<HabitEntry>>({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        emotion: 'Calm',
        note: '',
    });
    const [aiResponse, setAiResponse] = useState<string>('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [characterPrompt, setCharacterPrompt] = useState<string>('');

    const addHabitEntry = async () => {
        if (!newEntry.note) {
            alert("Please add a small note about how you're feeling!");
            return;
        }

        // Generate AI response if not already present
        let response = aiResponse;
        if (!response) {
            response = await generateAIResponse(newEntry.emotion as Emotion, newEntry.note);
        }

        const entry: HabitEntry = {
            id: `entry-${Date.now()}`,
            date: newEntry.date || new Date().toISOString().split("T")[0],
            time: newEntry.time || new Date().toTimeString().slice(0, 5),
            emotion: (newEntry.emotion as Emotion) || "Calm",
            note: newEntry.note,
            aiResponse: response,
        };
        setHabitEntries((prev) => [entry, ...prev]);
        try {
            await addHabitEntryFs(uid, entry);
        } catch (e) {
            console.error('Failed to save habit entry:', e);
        }
        setNewEntry({
            date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5),
            emotion: 'Calm', note: '',
        });
        setAiResponse('');
        setTrackerView('history');
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        // Optimistic update
        setHabitEntries((prev) => prev.filter((e) => e.id !== entryId));

        try {
            await deleteHabitEntry(uid, entryId);
        } catch (e) {
            console.error('Failed to delete habit entry:', e);
            // Revert if failed (simplified, ideally we'd re-fetch or have more robust rollback)
            alert('Failed to delete entry from server.');
        }
    };

    useEffect(() => {
        if (!uid) return;
        const unsub = listenHabitEntries(uid, (entries) => {
            setHabitEntries((prev) => {
                const byId = new Map<string, HabitEntry>();
                entries.forEach((e) => byId.set(e.id, e));
                prev.forEach((e) => {
                    if (!byId.has(e.id)) byId.set(e.id, e);
                });
                const ordered = [...entries, ...prev.filter((e) => !entries.find((x) => x.id === e.id))];
                return ordered;
            });
        });
        const unsubProfile = listenCharacterProfile(uid, (profile) => {
            if (profile?.generatedPrompt) {
                setCharacterPrompt(profile.generatedPrompt);
            }
        });
        return () => {
            unsub();
            unsubProfile();
        };
    }, [uid]);

    const generateAIResponse = async (emotion: Emotion, note: string) => {
        try {
            setLoadingAI(true);
            const systemInstruction = characterPrompt
                ? `You are acting as a specific character. ${characterPrompt}`
                : `You are a wise and gentle Forest Spirit (a Dungeon Guide).`;

            const prompt = `${systemInstruction}
            A traveler has come to you in the Forest of Emotions.
            
            Traveler's Emotion: ${emotion}
            Traveler's Note: "${note}"
            
            Respond to them with a short, comforting, or encouraging message (max 2 sentences). Be mystical but grounded.
            If they are happy/excited, celebrate with them. If they are sad/anxious, offer solace.`;

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = result.text.trim();
            setAiResponse(text);
            return text;
        } catch (error) {
            console.error('Failed to generate AI response:', error);
            return "The forest whispers quietly...";
        } finally {
            setLoadingAI(false);
        }
    };

    const getFilteredEntries = () => {
        if (!dateFilter) return habitEntries;
        return habitEntries.filter((entry) => entry.date.includes(dateFilter));
    };

    const getEmotionFrequency = () => {
        const frequency: Record<string, number> = {};
        habitEntries.forEach((entry) => {
            frequency[entry.emotion] = (frequency[entry.emotion] || 0) + 1;
        });
        return Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    };

    const exportHabits = () => {
        const dataStr = JSON.stringify(habitEntries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-forest-journal.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importHabits = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('This will merge your imported journal with your current one. Ready?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read");
                const importedEntries: HabitEntry[] = JSON.parse(text);

                if (!Array.isArray(importedEntries) || (importedEntries.length > 0 && !importedEntries[0].id)) {
                    alert('Invalid file format.');
                    return;
                }

                const combinedEntries = [...importedEntries, ...habitEntries];
                const uniqueEntries = Array.from(new Map(combinedEntries.map(entry => [entry.id, entry])).values());

                setHabitEntries(uniqueEntries);
                alert('Journal imported successfully! 🌲');
            } catch (error) {
                console.error("Failed to import:", error);
                alert('Oops! Failed to import. Please check the file format.');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <div className="mb-6 flex gap-2">
                <Button variant={trackerView === 'entry' ? 'default' : 'outline'} onClick={() => setTrackerView('entry')}><Plus className="w-4 h-4 mr-2" />New Entry</Button>
                <Button variant={trackerView === 'history' ? 'default' : 'outline'} onClick={() => setTrackerView('history')}><Calendar className="w-4 h-4 mr-2" />Journal</Button>
                <Button variant={trackerView === 'analytics' ? 'default' : 'outline'} onClick={() => setTrackerView('analytics')}><BarChart3 className="w-4 h-4 mr-2" />Patterns</Button>
            </div>

            {trackerView === 'entry' && (
                <Card>
                    <CardHeader><CardTitle>🌲 Forest Journal</CardTitle><CardDescription>How is your spirit today?</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label htmlFor="entry-date">Date</Label><Input id="entry-date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
                            <div><Label htmlFor="entry-time">Time</Label><Input id="entry-time" type="time" value={newEntry.time} onChange={(e) => setNewEntry({ ...newEntry, time: e.target.value })} /></div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Current Emotion</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {EMOTIONS.map((emo) => (
                                    <button
                                        key={emo.value}
                                        type="button"
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${newEntry.emotion === emo.value ? `ring-2 ring-offset-2 ring-primary ${emo.color}` : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        onClick={() => setNewEntry({ ...newEntry, emotion: emo.value })}
                                    >
                                        {emo.icon}
                                        <span className="text-xs mt-1 font-medium">{emo.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="entry-note">Your Thoughts</Label>
                            <Textarea
                                id="entry-note"
                                placeholder="What's on your mind? The forest listens..."
                                value={newEntry.note}
                                onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => generateAIResponse(newEntry.emotion as Emotion, newEntry.note || "")}
                                disabled={loadingAI || !newEntry.note}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Ask the Forest Spirit
                            </Button>
                        </div>

                        {aiResponse && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                                <div className="flex items-start gap-3">
                                    <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Forest Spirit says:</p>
                                        <p className="text-sm text-purple-800 dark:text-purple-200 mt-1 italic">"{aiResponse}"</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button onClick={addHabitEntry} className="w-full" disabled={!newEntry.note}>Log Entry 🍃</Button>
                    </CardContent>
                </Card>
            )}

            {trackerView === 'history' && (
                <div>
                    <div className="mb-4 flex flex-wrap gap-4 justify-between items-center">
                        <Input placeholder="Filter by date..." value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
                        <div className="flex gap-2">
                            <input type="file" id="import-habits-input" accept=".json" onChange={importHabits} className="hidden" />
                            <Button variant="outline" onClick={() => document.getElementById('import-habits-input')?.click()}>
                                <Upload className="w-4 h-4 mr-2" />Import
                            </Button>
                            <Button variant="outline" onClick={exportHabits}>
                                <Download className="w-4 h-4 mr-2" />Export
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {getFilteredEntries().map((entry) => {
                            const emo = EMOTIONS.find(e => e.value === entry.emotion) || EMOTIONS[1];
                            return (
                                <Card key={entry.id}>
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2 items-center">
                                                <Badge variant="outline">{entry.date}</Badge>
                                                <Badge variant="outline">{entry.time}</Badge>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${emo.color}`}>
                                                    {emo.icon}
                                                    {entry.emotion}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                onClick={() => handleDeleteEntry(entry.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="text-gray-700 dark:text-gray-300">{entry.note}</div>
                                            {entry.aiResponse && (
                                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border-l-4 border-purple-400">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Forest Spirit</p>
                                                    <p className="italic text-gray-600 dark:text-gray-300">"{entry.aiResponse}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )
            }

            {
                trackerView === 'analytics' && (
                    <div className="grid gap-6 md:grid-cols-1">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Emotion Patterns</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {getEmotionFrequency().map(([emotion, count]) => {
                                        const emo = EMOTIONS.find(e => e.value === emotion) || EMOTIONS[1];
                                        return (
                                            <div key={emotion} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1 rounded ${emo.color}`}>{emo.icon}</div>
                                                    <span className="font-medium">{emotion}</span>
                                                </div>
                                                <span className="font-bold text-lg">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

        </div >
    );
};
