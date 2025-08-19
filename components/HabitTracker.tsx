
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Label } from './ui/Label';
import { Plus, Calendar, BarChart3, TrendingUp, Download, Upload } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultHabitEntries } from '../constants';
import { HabitEntry, HabitState } from '../types';

export const HabitTracker: React.FC = () => {
    const [habitEntries, setHabitEntries] = useLocalStorage<HabitEntry[]>('habitTrackerData', defaultHabitEntries);
    const [trackerView, setTrackerView] = useState<'entry' | 'history' | 'analytics'>('entry');
    const [newEntry, setNewEntry] = useState<Partial<HabitEntry>>({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        state: 'Clear', statusMemo: '', trigger: '', action: '', remarks: '',
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dateFilter, setDateFilter] = useState('');

    const addHabitEntry = () => {
        if (!newEntry.statusMemo || !newEntry.trigger || !newEntry.action) {
            alert("Please fill in Status Memo, Trigger, and Action fields.");
            return;
        }
        const entry: HabitEntry = {
            id: `entry-${Date.now()}`,
            date: newEntry.date || new Date().toISOString().split("T")[0],
            time: newEntry.time || new Date().toTimeString().slice(0, 5),
            state: newEntry.state || "Clear",
            statusMemo: newEntry.statusMemo, trigger: newEntry.trigger, action: newEntry.action,
            remarks: newEntry.remarks,
        };
        setHabitEntries((prev) => [entry, ...prev]);
        setNewEntry({
            date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5),
            state: 'Clear', statusMemo: '', trigger: '', action: '', remarks: '',
        });
        setTrackerView('history');
    };
    
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
    
    const getSuggestedActions = () => getCommonActions().map(([action]) => action);

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
        link.download = 'habit-tracker-history.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importHabits = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('This will merge the imported history with your current history. Continue?')) {
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
                alert('History imported successfully!');
            } catch (error) {
                console.error("Failed to import history:", error);
                alert('Failed to import history. Please check the file format.');
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
                <Button variant={trackerView === 'history' ? 'default' : 'outline'} onClick={() => setTrackerView('history')}><Calendar className="w-4 h-4 mr-2" />History</Button>
                <Button variant={trackerView === 'analytics' ? 'default' : 'outline'} onClick={() => setTrackerView('analytics')}><BarChart3 className="w-4 h-4 mr-2" />Analytics</Button>
            </div>

            {trackerView === 'entry' && (
                <Card>
                    <CardHeader><CardTitle>📝 New Entry</CardTitle><CardDescription>Record your current state and habits</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div><Label htmlFor="entry-date">Date</Label><Input id="entry-date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
                            <div><Label htmlFor="entry-time">Time</Label><Input id="entry-time" type="time" value={newEntry.time} onChange={(e) => setNewEntry({ ...newEntry, time: e.target.value })} /></div>
                        </div>
                        <div>
                            <Label htmlFor="entry-state">Mental State</Label>
                            <Select value={newEntry.state} onValueChange={(value) => setNewEntry({ ...newEntry, state: value as HabitState })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Clear">Clear</SelectItem><SelectItem value="Focused">Focused</SelectItem><SelectItem value="Scattered">Scattered</SelectItem>
                                    <SelectItem value="Foggy">Foggy</SelectItem><SelectItem value="Sharp">Sharp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="entry-status">Status Memo *</Label><Textarea id="entry-status" placeholder="How are you feeling mentally and physically?" value={newEntry.statusMemo} onChange={(e) => setNewEntry({ ...newEntry, statusMemo: e.target.value })} /></div>
                        <div><Label htmlFor="entry-trigger">Trigger *</Label><Textarea id="entry-trigger" placeholder="What events or thoughts influenced your current state?" value={newEntry.trigger} onChange={(e) => setNewEntry({ ...newEntry, trigger: e.target.value })} /></div>
                        <div>
                            <Label htmlFor="entry-action">Action (Small Habit) *</Label>
                            <div className="relative">
                                <Textarea id="entry-action" placeholder="What small habit or action did you take?" value={newEntry.action} onChange={(e) => setNewEntry({ ...newEntry, action: e.target.value })} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                                {showSuggestions && getSuggestedActions().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        <div className="p-2 text-xs text-gray-500 border-b">💡 Suggested actions (from your history):</div>
                                        {getSuggestedActions().map((action, index) => (
                                            <button key={index} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => selectSuggestedAction(action)}>{action}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div><Label htmlFor="entry-remarks">Remarks</Label><Textarea id="entry-remarks" placeholder="Additional notes (optional)" value={newEntry.remarks} onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })} /></div>
                        <Button onClick={addHabitEntry} className="w-full">Add Entry</Button>
                    </CardContent>
                </Card>
            )}

            {trackerView === 'history' && (
                <div>
                    <div className="mb-4 flex flex-wrap gap-4 justify-between items-center">
                        <Input placeholder="Filter by date (YYYY-MM-DD)" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
                         <div className="flex gap-2">
                             <input type="file" id="import-habits-input" accept=".json" onChange={importHabits} className="hidden" />
                            <Button variant="outline" onClick={() => document.getElementById('import-habits-input')?.click()}>
                                <Upload className="w-4 h-4 mr-2" />Import History
                            </Button>
                            <Button variant="outline" onClick={exportHabits}>
                                <Download className="w-4 h-4 mr-2" />Export History
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
                                            <Badge variant={entry.state === "Clear" || entry.state === "Sharp" ? "default" : entry.state === "Focused" ? "secondary" : "destructive"}>{entry.state}</Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Status:</strong> {entry.statusMemo}</div>
                                        <div><strong>Trigger:</strong> {entry.trigger}</div>
                                        <div><strong>Action:</strong> {entry.action}</div>
                                        {entry.remarks && <div><strong>Remarks:</strong> {entry.remarks}</div>}
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
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Mental State Frequency</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getStateFrequency().map(([state, count]) => (
                        <div key={state} className="flex justify-between items-center">
                          <Badge variant={state === "Clear" || state === "Sharp" ? "default" : state === "Focused" ? "secondary" : "destructive"}>{state}</Badge>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>🎯 Common Triggers</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">{getCommonTriggers().map(([trigger, count], index) => (<div key={index} className="flex justify-between items-center text-sm"><span className="flex-1 truncate">{trigger}</span><Badge variant="outline">{count}</Badge></div>))}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>✅ Common Actions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">{getCommonActions().map(([action, count], index) => (<div key={index} className="flex justify-between items-center text-sm"><span className="flex-1 truncate">{action}</span><Badge variant="outline">{count}</Badge></div>))}</div>
                  </CardContent>
                </Card>
              </div>
            )}

        </div>
    );
};
