
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Label } from './ui/Label';
import { Plus, Calendar, BarChart3, TrendingUp, Download, Upload, Sparkles } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultHabitEntries } from '../constants';
import { HabitEntry, HabitState } from '../types';
import { GoogleGenAI } from '@google/genai';
import { addHabitEntry as addHabitEntryFs, listenHabitEntries } from '../services/firestore';

interface HabitTrackerProps {
    uid: string;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ uid }) => {
    const [habitEntries, setHabitEntries] = useLocalStorage<HabitEntry[]>('habitTrackerData', defaultHabitEntries);
    const [trackerView, setTrackerView] = useState<'entry' | 'history' | 'analytics'>('entry');
    const [newEntry, setNewEntry] = useState<Partial<HabitEntry>>({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        state: 'Chilled', statusMemo: '', trigger: '', action: '', remarks: '',
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dateFilter, setDateFilter] = useState('');

    const addHabitEntry = async () => {
        if (!newEntry.statusMemo || !newEntry.trigger || !newEntry.action) {
            alert("Hold up! You need to fill in your Vibe Check, What Happened, and What You Did fields to complete this slaking entry! 😴");
            return;
        }
        const entry: HabitEntry = {
            id: `entry-${Date.now()}`,
            date: newEntry.date || new Date().toISOString().split("T")[0],
            time: newEntry.time || new Date().toTimeString().slice(0, 5),
            state: newEntry.state || "Chilled",
            statusMemo: newEntry.statusMemo, trigger: newEntry.trigger, action: newEntry.action,
            remarks: newEntry.remarks,
        };
        setHabitEntries((prev) => [entry, ...prev]);
        try {
            await addHabitEntryFs(uid, entry);
        } catch (e) {
            console.error('Failed to save habit entry:', e);
        }
        setNewEntry({
            date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5),
            state: 'Chilled', statusMemo: '', trigger: '', action: '', remarks: '',
        });
        setTrackerView('history');
    };

    useEffect(() => {
        if (!uid) return;
        const unsub = listenHabitEntries(uid, (entries) => {
            setHabitEntries((prev) => {
                const byId = new Map<string, HabitEntry>();
                // Merge FS entries and cached local entries, prefer FS when conflict
                entries.forEach((e) => byId.set(e.id, e));
                prev.forEach((e) => {
                    if (!byId.has(e.id)) byId.set(e.id, e);
                });
                // Keep Firestore order first
                const ordered = [...entries, ...prev.filter((e) => !entries.find((x) => x.id === e.id))];
                return ordered;
            });
        });
        return () => unsub();
    }, [uid]);
    
    const getFilteredEntries = () => {
        if (!dateFilter) return habitEntries;
        return habitEntries.filter((entry) => entry.date.includes(dateFilter));
    };

    const getStateFrequency = () => {
        const frequency: Record<string, number> = {};
        habitEntries.forEach((entry) => {
            frequency[entry.state] = (frequency[entry.state] || 0) + 1;
        });
        return Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    };

    const getCommonTriggers = () => {
        const triggers = habitEntries.map((entry) => entry.trigger.toLowerCase().trim()).filter(Boolean);
        const frequency: Record<string, number> = {};
        triggers.forEach((trigger) => { frequency[trigger] = (frequency[trigger] || 0) + 1; });
        return Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getCommonActions = () => {
        const actions = habitEntries.map((entry) => entry.action.toLowerCase().trim()).filter(Boolean);
        const frequency: Record<string, number> = {};
        actions.forEach((action) => { frequency[action] = (frequency[action] || 0) + 1; });
        return Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const generateAISuggestions = async () => {
        if (!newEntry.state || !newEntry.statusMemo || !newEntry.trigger) {
            return getCommonActions().map(([action]) => action);
        }

        try {
            setLoadingSuggestions(true);
            
            // Get historical patterns for context
            const commonActions = getCommonActions().slice(0, 3).map(([action]) => action);
            const recentEntries = habitEntries.slice(0, 5);
            
            const prompt = `You are a helpful assistant for a fun "Slaking Log" app where people track their daily vibes and what they do about them. 

Current situation:
- Vibe: ${newEntry.state}
- How they're feeling: "${newEntry.statusMemo}"
- What happened: "${newEntry.trigger}"

Historical context (their common go-to moves):
${commonActions.length > 0 ? commonActions.map(action => `- ${action}`).join('\n') : 'No historical data yet'}

Recent entries for pattern context:
${recentEntries.map(entry => `- When feeling "${entry.state}" they did: "${entry.action}"`).join('\n')}

Generate 4-6 fun, actionable, and personalized suggestions for what they could do about their current situation. Keep the tone casual and playful to match the "slaking" theme. Each suggestion should be:
1. Practical and doable
2. Appropriate for their current vibe and trigger
3. Fun or at least not too serious
4. Different from each other

Format as a simple list, one suggestion per line, without bullets or numbers.`;

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            
            const suggestions = result.text
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('-') && !s.match(/^\d+\./))
                .slice(0, 6);
            
            setAiSuggestions(suggestions);
            return suggestions;
        } catch (error) {
            console.error('Failed to generate AI suggestions:', error);
            // Fallback to historical suggestions
            return getCommonActions().map(([action]) => action);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const getSuggestedActions = () => {
        if (aiSuggestions.length > 0) {
            return aiSuggestions;
        }
        return getCommonActions().map(([action]) => action);
    };

    const selectSuggestedAction = (action: string) => {
        setNewEntry({ ...newEntry, action });
        setShowSuggestions(false);
    };
    
    const exportHabits = () => {
        const dataStr = JSON.stringify(habitEntries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-slaking-adventures.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importHabits = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('This will merge your imported slaks with your current slaking log. Ready to combine your slaking adventures?')) {
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
                alert('Slaking adventures imported successfully! 🎉');
            } catch (error) {
                console.error("Failed to import slaks:", error);
                alert('Oops! Failed to import your slaks. Please check the file format. 😕');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <div className="mb-6 flex gap-2">
                <Button variant={trackerView === 'entry' ? 'default' : 'outline'} onClick={() => setTrackerView('entry')}><Plus className="w-4 h-4 mr-2" />New Slak</Button>
                <Button variant={trackerView === 'history' ? 'default' : 'outline'} onClick={() => setTrackerView('history')}><Calendar className="w-4 h-4 mr-2" />Slak History</Button>
                <Button variant={trackerView === 'analytics' ? 'default' : 'outline'} onClick={() => setTrackerView('analytics')}><BarChart3 className="w-4 h-4 mr-2" />Slak Stats</Button>
            </div>

            {trackerView === 'entry' && (
                <Card>
                    <CardHeader><CardTitle>� New Slak Entry</CardTitle><CardDescription>Time to log your latest slaking adventure!</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div><Label htmlFor="entry-date">Date</Label><Input id="entry-date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
                            <div><Label htmlFor="entry-time">Time</Label><Input id="entry-time" type="time" value={newEntry.time} onChange={(e) => setNewEntry({ ...newEntry, time: e.target.value })} /></div>
                        </div>
                        <div>
                            <Label htmlFor="entry-state">Current Vibe</Label>
                            <Select value={newEntry.state} onValueChange={(value) => setNewEntry({ ...newEntry, state: value as HabitState })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Chilled">😎 Chilled</SelectItem><SelectItem value="Vibing">🎵 Vibing</SelectItem><SelectItem value="Scattered">🤯 Scattered</SelectItem>
                                    <SelectItem value="Sleepy">😴 Sleepy</SelectItem><SelectItem value="Energized">⚡ Energized</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="entry-status">Vibe Check *</Label><Textarea id="entry-status" placeholder="What's your current mood and energy level? Are you thriving or just surviving?" value={newEntry.statusMemo} onChange={(e) => setNewEntry({ ...newEntry, statusMemo: e.target.value })} /></div>
                        <div><Label htmlFor="entry-trigger">What Happened? *</Label><Textarea id="entry-trigger" placeholder="What made you feel this way? Did someone steal your snacks? Too much coffee? Monday happened?" value={newEntry.trigger} onChange={(e) => setNewEntry({ ...newEntry, trigger: e.target.value })} /></div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="entry-action">What You Did *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateAISuggestions}
                                    disabled={loadingSuggestions || !newEntry.state || !newEntry.statusMemo || !newEntry.trigger}
                                    className="text-xs"
                                >
                                    {loadingSuggestions ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-500 mr-1"></div>
                                            Thinking...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            AI Ideas
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="relative">
                                <Textarea id="entry-action" placeholder="What did you do about it? Nap? Snack? Procrastinate productively?" value={newEntry.action} onChange={(e) => setNewEntry({ ...newEntry, action: e.target.value })} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                                {showSuggestions && getSuggestedActions().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        <div className="p-2 text-xs text-gray-500 border-b">
                                            {aiSuggestions.length > 0 ? (
                                                <><Sparkles className="w-3 h-3 inline mr-1" />AI-powered suggestions:</>
                                            ) : (
                                                "🎯 Your go-to slaking moves:"
                                            )}
                                        </div>
                                        {getSuggestedActions().map((action, index) => (
                                            <button key={index} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => selectSuggestedAction(action)}>{action}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div><Label htmlFor="entry-remarks">Extra Thoughts</Label><Textarea id="entry-remarks" placeholder="Any other random thoughts or observations? (totally optional)" value={newEntry.remarks} onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })} /></div>
                        <Button onClick={addHabitEntry} className="w-full">Log This Slak! 🎯</Button>
                    </CardContent>
                </Card>
            )}

            {trackerView === 'history' && (
                <div>
                    <div className="mb-4 flex flex-wrap gap-4 justify-between items-center">
                        <Input placeholder="Find your slaks by date (YYYY-MM-DD)" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
                         <div className="flex gap-2">
                             <input type="file" id="import-habits-input" accept=".json" onChange={importHabits} className="hidden" />
                            <Button variant="outline" onClick={() => document.getElementById('import-habits-input')?.click()}>
                                <Upload className="w-4 h-4 mr-2" />Import Slaks
                            </Button>
                            <Button variant="outline" onClick={exportHabits}>
                                <Download className="w-4 h-4 mr-2" />Export Slaks
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {getFilteredEntries().map((entry) => (
                            <Card key={entry.id}>
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2 flex-wrap">
                                            <Badge variant="outline">{entry.date}</Badge><Badge variant="outline">{entry.time}</Badge>
                                            <Badge variant={entry.state === "Chilled" || entry.state === "Energized" ? "default" : entry.state === "Vibing" ? "secondary" : "destructive"}>{entry.state}</Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Vibe:</strong> {entry.statusMemo}</div>
                                        <div><strong>What Happened:</strong> {entry.trigger}</div>
                                        <div><strong>What You Did:</strong> {entry.action}</div>
                                        {entry.remarks && <div><strong>Extra Thoughts:</strong> {entry.remarks}</div>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {trackerView === 'analytics' && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Your Vibe Patterns</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getStateFrequency().map(([state, count]) => (
                        <div key={state} className="flex justify-between items-center">
                          <Badge variant={state === "Chilled" || state === "Energized" ? "default" : state === "Vibing" ? "secondary" : "destructive"}>{state}</Badge>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>💥 What Sets You Off</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">{getCommonTriggers().map(([trigger, count], index) => (<div key={index} className="flex justify-between items-center text-sm"><span className="flex-1 truncate">{trigger}</span><Badge variant="outline">{count}</Badge></div>))}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>🎯 Your Go-To Moves</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">{getCommonActions().map(([action, count], index) => (<div key={index} className="flex justify-between items-center text-sm"><span className="flex-1 truncate">{action}</span><Badge variant="outline">{count}</Badge></div>))}</div>
                  </CardContent>
                </Card>
              </div>
            )}

        </div>
    );
};
