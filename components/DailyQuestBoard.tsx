import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Checkbox } from './ui/Checkbox';
import { Plus, Edit, MapPin, Calendar, ChevronLeft, ChevronRight, Trash2, Sparkles, LayoutGrid, LayoutList } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultWeekData, DAYS, DAY_NAMES } from '../constants';
import { WeekData, ScheduleBlock, DungeonLog } from '../types';
import { EditBlockDialog } from './EditBlockDialog';
import { NewWeekDialog } from './NewWeekDialog';
import { getWeekKey, listenWeek, saveWeek, toggleBlockDone as toggleBlockDoneFs, updateBlock as updateBlockFs, addDungeonLog, listenDungeonLogs, listenCharacterProfile } from '../services/firestore';

interface DailyQuestBoardProps {
    uid: string;
}

type ViewMode = 'daily' | 'weekly';

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
};

const getCurrentDayKey = (date: Date): string => {
    const dayIndex = date.getDay();
    if (dayIndex === 0) return DAYS[6];
    return DAYS[dayIndex - 1];
};

const formatDate = (date: Date): string => {
    // Use local timezone to avoid date offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDate = (dateStr: string): Date => {
    return new Date(dateStr + 'T00:00:00');
};

export const DailyQuestBoard: React.FC<DailyQuestBoardProps> = ({ uid }) => {
    const [weekData, setWeekData] = useLocalStorage<WeekData>('dungeonMapData', defaultWeekData);
    const [dungeonLogs, setDungeonLogs] = useLocalStorage<DungeonLog[]>('dungeonLogs', []);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => getStartOfWeek(new Date()));
    const [loadingAI, setLoadingAI] = useState(false);
    const [characterPrompt, setCharacterPrompt] = useState<string>('');
    const [lastSeenWeekKey, setLastSeenWeekKey] = useLocalStorage<string>('lastSeenWeekKey', '');
    const [showNewWeekDialog, setShowNewWeekDialog] = useState(false);

    const handleToggleBlockDone = (day: string, blockId: string) => {
        setWeekData((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                blocks: prev[day].blocks.map((block) => {
                    if (block.id === blockId) {
                        const updatedBlock = { ...block, done: !block.done };
                        if (updatedBlock.done && !block.done) {
                            const log: DungeonLog = {
                                id: `log-${Date.now()}`, blockId: block.id, blockName: block.name,
                                day: day, completedAt: new Date().toISOString(),
                                energyLevel: 3, blockType: block.blockType,
                            };
                            setDungeonLogs((prevLogs) => [log, ...prevLogs]);
                            addDungeonLog(uid, log).catch((e) => console.error('Failed to add log:', e));
                        }
                        return updatedBlock;
                    }
                    return block;
                }),
            },
        }));
        const wkey = getWeekKey(weekStartDate);
        const current = (weekData[day]?.blocks || []).find((b) => b.id === blockId);
        const nextDone = current ? !current.done : true;
        toggleBlockDoneFs(uid, wkey, day, blockId, nextDone).catch((e) => console.error('Failed to toggle block:', e));
    };

    const addNewBlock = (dayKey?: string) => {
        const targetDay = dayKey || getCurrentDayKey(selectedDate);
        const newBlock: ScheduleBlock = {
            id: `${targetDay}-${Date.now()}`, name: 'New Daily Quest', startTime: '09:00', endTime: '10:00',
            emoji: '⚔️', note: '', done: false, blockType: 'Focus', energyLevel: 'High',
        };
        const day = weekData[targetDay] || { title: '', theme: '', blocks: [] };
        const newWeek = {
            ...weekData,
            [targetDay]: { ...day, blocks: [...(day.blocks || []), newBlock] },
        } as WeekData;
        setWeekData(newWeek);
        const wkey = getWeekKey(weekStartDate);
        saveWeek(uid, wkey, newWeek).catch((e) => console.error('Failed to save week:', e));
    };

    const saveBlockEdit = (updatedBlock: ScheduleBlock, dayKey: string) => {
        setWeekData((prev) => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                blocks: (prev[dayKey]?.blocks || []).map((block) =>
                    block.id === updatedBlock.id ? updatedBlock : block
                ),
            },
        }));
        const wkey = getWeekKey(weekStartDate);
        updateBlockFs(uid, wkey, updatedBlock).catch((e) => console.error('Failed to update block:', e));
        setIsEditDialogOpen(false);
        setEditingBlock(null);
    };

    const handleDeleteBlock = (blockId: string, dayKey: string) => {
        if (!confirm('Are you sure you want to delete this quest?')) return;

        const day = weekData[dayKey];
        const newBlocks = (day.blocks || []).filter(b => b.id !== blockId);
        const newWeek = {
            ...weekData,
            [dayKey]: { ...day, blocks: newBlocks }
        };

        setWeekData(newWeek);
        const wkey = getWeekKey(weekStartDate);
        saveWeek(uid, wkey, newWeek).catch((e) => console.error('Failed to save week after delete:', e));
    };

    const generateAIQuest = async (count: number = 1, dayKey?: string) => {
        try {
            setLoadingAI(true);
            const targetDay = dayKey || getCurrentDayKey(selectedDate);

            const systemInstruction = characterPrompt
                ? `You are acting as a specific character. ${characterPrompt} You are a Dungeon Master for a productivity RPG.`
                : `You are a Dungeon Master for a productivity RPG.`;

            const prompt = `${systemInstruction}
            Generate ${count} daily quest(s) (tasks) for a user.
            Current Day Theme: ${weekData[targetDay]?.theme || "General Adventure"}
            
            Return ONLY a JSON array of objects with the following fields:
            - name: string (creative quest name)
            - emoji: string (single emoji)
            - startTime: string (HH:MM format, e.g. "10:00")
            - endTime: string (HH:MM format, e.g. "11:00")
            - note: string (short flavor text description)
            - blockType: "Focus" | "Flow" | "Admin" | "Social" | "Rest"
            - energyLevel: "High" | "Moderate" | "Low" | "Recharge"
            
            Do not include markdown formatting or code blocks. Just the raw JSON string.`;

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = result.text.trim().replace(/```json/g, '').replace(/```/g, '');
            let questDataArray = JSON.parse(text);

            if (!Array.isArray(questDataArray)) {
                questDataArray = [questDataArray];
            }

            const newBlocks: ScheduleBlock[] = questDataArray.map((questData: any, index: number) => ({
                id: `${targetDay}-${Date.now()}-${index}`,
                name: questData.name || "Mysterious Quest",
                startTime: questData.startTime || "12:00",
                endTime: questData.endTime || "13:00",
                emoji: questData.emoji || "📜",
                note: questData.note || "A quest from the ether...",
                blockType: questData.blockType || "Focus",
                energyLevel: questData.energyLevel || "Moderate",
                done: false,
            }));

            const day = weekData[targetDay] || { title: '', theme: '', blocks: [] };
            const newWeek = {
                ...weekData,
                [targetDay]: { ...day, blocks: [...(day.blocks || []), ...newBlocks] },
            } as WeekData;

            setWeekData(newWeek);
            const wkey = getWeekKey(weekStartDate);
            await saveWeek(uid, wkey, newWeek);

        } catch (error) {
            console.error('Failed to generate AI quest:', error);
            alert('The spirits are silent... (AI generation failed)');
        } finally {
            setLoadingAI(false);
        }
    };

    const generateWeekQuests = async () => {
        try {
            setLoadingAI(true);
            const systemInstruction = characterPrompt
                ? `You are acting as a specific character. ${characterPrompt} You are a Dungeon Master for a productivity RPG.`
                : `You are a Dungeon Master for a productivity RPG.`;

            const newWeekData = { ...weekData };

            // Generate quests for each day
            for (let i = 0; i < DAYS.length; i++) {
                const dayKey = DAYS[i];
                const dayTheme = weekData[dayKey]?.theme || "General Adventure";

                const prompt = `${systemInstruction}
                Generate 3 daily quests (tasks) for ${DAY_NAMES[i]}.
                Day Theme: ${dayTheme}
                
                Return ONLY a JSON array of 3 objects with the following fields:
                - name: string (creative quest name)
                - emoji: string (single emoji)
                - startTime: string (HH:MM format, e.g. "10:00")
                - endTime: string (HH:MM format, e.g. "11:00")
                - note: string (short flavor text description)
                - blockType: "Focus" | "Flow" | "Admin" | "Social" | "Rest"
                - energyLevel: "High" | "Moderate" | "Low" | "Recharge"
                
                Do not include markdown formatting or code blocks. Just the raw JSON string.`;

                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });

                const text = result.text.trim().replace(/```json/g, '').replace(/```/g, '');
                let questDataArray = JSON.parse(text);

                if (!Array.isArray(questDataArray)) {
                    questDataArray = [questDataArray];
                }

                const newBlocks: ScheduleBlock[] = questDataArray.map((questData: any, index: number) => ({
                    id: `${dayKey}-${Date.now()}-${index}`,
                    name: questData.name || "Mysterious Quest",
                    startTime: questData.startTime || "12:00",
                    endTime: questData.endTime || "13:00",
                    emoji: questData.emoji || "📜",
                    note: questData.note || "A quest from the ether...",
                    blockType: questData.blockType || "Focus",
                    energyLevel: questData.energyLevel || "Moderate",
                    done: false,
                }));

                const day = newWeekData[dayKey] || { title: '', theme: '', blocks: [] };
                newWeekData[dayKey] = { ...day, blocks: [...(day.blocks || []), ...newBlocks] };

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            setWeekData(newWeekData);
            const wkey = getWeekKey(weekStartDate);
            await saveWeek(uid, wkey, newWeekData);
            setShowNewWeekDialog(false);

        } catch (error) {
            console.error('Failed to generate week quests:', error);
            alert('The spirits are silent... (AI generation failed)');
        } finally {
            setLoadingAI(false);
        }
    };

    useEffect(() => {
        if (!uid) return;
        const wkey = getWeekKey(weekStartDate);

        const unsubWeek = listenWeek(uid, wkey, (doc) => {
            // Reset to default week data, then overlay any saved data from Firestore
            // This ensures old week data doesn't carry over when changing weeks
            const newWeekData = doc?.data
                ? { ...defaultWeekData, ...doc.data }
                : defaultWeekData;
            setWeekData(newWeekData);

            // Check if this is a new week AND has no existing data
            if (lastSeenWeekKey && lastSeenWeekKey !== wkey) {
                // Only show dialog if week has no blocks
                const hasAnyBlocks = DAYS.some(day => newWeekData[day]?.blocks?.length > 0);
                if (!hasAnyBlocks) {
                    setShowNewWeekDialog(true);
                }
            }
            setLastSeenWeekKey(wkey);
        });
        const unsubLogs = listenDungeonLogs(uid, (logs) => setDungeonLogs(logs));
        const unsubProfile = listenCharacterProfile(uid, (profile) => {
            if (profile?.generatedPrompt) {
                setCharacterPrompt(profile.generatedPrompt);
            }
        });
        return () => {
            unsubWeek();
            unsubLogs();
            unsubProfile();
        };
    }, [uid, weekStartDate]);

    // Update weekStartDate when selectedDate changes
    useEffect(() => {
        const newWeekStart = getStartOfWeek(selectedDate);
        if (newWeekStart.getTime() !== weekStartDate.getTime()) {
            setWeekStartDate(newWeekStart);
        }
    }, [selectedDate]);

    const selectedDayKey = getCurrentDayKey(selectedDate);
    const currentDayData = weekData[selectedDayKey];
    const dayIndex = DAYS.indexOf(selectedDayKey);
    const dayName = DAY_NAMES[dayIndex];

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        setSelectedDate(newDate);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = parseDate(e.target.value);
        setSelectedDate(newDate);
    };

    const renderQuestCard = (block: ScheduleBlock, dayKey: string) => (
        <div key={block.id} className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${block.done ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900" : "bg-white border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:border-gray-700"}`}>
            <Checkbox
                checked={block.done}
                onCheckedChange={() => handleToggleBlockDone(dayKey, block.id)}
                className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{block.emoji}</span>
                        <h3 className={`font-semibold ${block.done ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>
                            {block.name}
                        </h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingBlock(block); setIsEditDialogOpen(true); }}>
                            <Edit className="w-4 h-4 text-gray-400 hover:text-purple-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block.id, dayKey)}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {block.startTime} - {block.endTime}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{block.blockType}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{block.energyLevel}</Badge>
                </div>
                {block.note && (
                    <p className={`mt-2 text-sm ${block.done ? "text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
                        {block.note}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-purple-600" />
                        Daily Quest Board
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {viewMode === 'daily' ? `${dayName} • ${currentDayData?.theme}` : 'Weekly Overview'}
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        variant={viewMode === 'daily' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('daily')}
                        className={viewMode === 'daily' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                        <LayoutList className="w-4 h-4 mr-2" />
                        Daily
                    </Button>
                    <Button
                        variant={viewMode === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('weekly')}
                        className={viewMode === 'weekly' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Weekly
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 items-center justify-center">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <input
                    type="date"
                    value={formatDate(selectedDate)}
                    onChange={handleDateChange}
                    className="px-4 py-2 border rounded-md text-sm font-medium text-center dark:bg-gray-800 dark:border-gray-700"
                />
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setSelectedDate(today);
                    }}
                >
                    Today
                </Button>
            </div>

            {viewMode === 'daily' ? (
                <Card className="border-2 border-purple-100 dark:border-purple-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium">Active Quests</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => generateAIQuest(1)}
                                variant="outline"
                                size="sm"
                                disabled={loadingAI}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
                            >
                                <Sparkles className={`w-4 h-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
                                {loadingAI ? 'Summoning...' : 'AI Quest'}
                            </Button>
                            <Button
                                onClick={() => generateAIQuest(3)}
                                variant="outline"
                                size="sm"
                                disabled={loadingAI}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
                            >
                                <Sparkles className={`w-4 h-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
                                x3
                            </Button>
                            <Button onClick={() => addNewBlock()} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                                <Plus className="w-4 h-4 mr-2" /> New Quest
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {currentDayData.blocks.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No quests for today. The dungeon is quiet...</p>
                                    <Button variant="link" onClick={() => addNewBlock()}>Add a quest?</Button>
                                </div>
                            ) : (
                                currentDayData.blocks.map((block) => renderQuestCard(block, selectedDayKey))
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {DAYS.map((dayKey, index) => {
                        const dayData = weekData[dayKey];
                        const weekDate = new Date(weekStartDate);
                        weekDate.setDate(weekStartDate.getDate() + index);
                        const isToday = weekDate.toDateString() === new Date().toDateString();
                        const isSelected = weekDate.toDateString() === selectedDate.toDateString();

                        return (
                            <Card
                                key={dayKey}
                                className={`border-2 transition-all cursor-pointer ${isSelected
                                    ? 'border-purple-500 shadow-lg'
                                    : isToday
                                        ? 'border-blue-300 dark:border-blue-700'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                    }`}
                                onClick={() => {
                                    setSelectedDate(weekDate);
                                    setViewMode('daily');
                                }}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">
                                            {DAY_NAMES[index]}
                                            {isToday && <Badge variant="outline" className="ml-2 text-[10px]">Today</Badge>}
                                        </CardTitle>
                                        <span className="text-xs text-gray-500">{weekDate.getMonth() + 1}/{weekDate.getDate()}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{dayData.theme}</p>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {dayData.blocks.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-gray-400">No quests</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addNewBlock(dayKey);
                                                }}
                                                className="mt-2 text-xs"
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {dayData.blocks.map((block) => (
                                                    <div
                                                        key={block.id}
                                                        className={`text-xs p-2 rounded border ${block.done
                                                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                                            }`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <Checkbox
                                                                checked={block.done}
                                                                onCheckedChange={() => handleToggleBlockDone(dayKey, block.id)}
                                                                className="h-3 w-3"
                                                            />
                                                            <span>{block.emoji}</span>
                                                            <span className={`flex-1 truncate ${block.done ? 'line-through text-gray-500' : ''}`}>
                                                                {block.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-1 pt-2 border-t">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addNewBlock(dayKey);
                                                    }}
                                                    className="flex-1 text-xs h-7"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Add
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        generateAIQuest(1, dayKey);
                                                    }}
                                                    disabled={loadingAI}
                                                    className="flex-1 text-xs h-7"
                                                >
                                                    <Sparkles className={`w-3 h-3 mr-1 ${loadingAI ? 'animate-spin' : ''}`} /> AI
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {editingBlock && (
                <EditBlockDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    block={editingBlock}
                    onSave={(updatedBlock) => {
                        // Find which day this block belongs to
                        const dayKey = Object.keys(weekData).find(key =>
                            weekData[key].blocks.some(b => b.id === updatedBlock.id)
                        );
                        if (dayKey) {
                            saveBlockEdit(updatedBlock, dayKey);
                        }
                    }}
                    onCancel={() => {
                        setIsEditDialogOpen(false);
                        setEditingBlock(null);
                    }}
                />
            )}

            <NewWeekDialog
                isOpen={showNewWeekDialog}
                weekStartDate={weekStartDate}
                weekEndDate={new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)}
                onGenerateQuests={generateWeekQuests}
                onSkip={() => setShowNewWeekDialog(false)}
                isGenerating={loadingAI}
            />
        </div>
    );
};
