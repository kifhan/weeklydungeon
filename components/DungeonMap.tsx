
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/Collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import { Label } from './ui/Label';
import {
  ChevronDown, Search, Download, RotateCcw, Printer, Plus, Edit, Calendar, MapPin, History, Upload, Sparkles,
} from 'lucide-react';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultWeekData } from '../constants';
import { DAY_NAMES, DAYS } from '../constants';
import { WeekData, ScheduleBlock, DungeonLog, BlockType, EnergyLevel } from '../types';
import { EditBlockDialog } from './EditBlockDialog';
import { GoogleGenAI, Type } from "@google/genai";

const getEnergyValue = (blockType: BlockType): number => {
    switch (blockType) {
      case "Focus": return 5;
      case "Flow": return 4;
      case "Admin": return 3;
      case "Social": return 3;
      case "Recovery": return 2;
      default: return 3;
    }
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    return d;
};

const getCurrentDayKey = (): string => {
    const todayIndex = new Date().getDay(); // Sunday: 0, Monday: 1, ..., Saturday: 6
    // DAYS array is zero-indexed, with Monday at 0.
    if (todayIndex === 0) { // Sunday
        return DAYS[6]; // 'sunday'
    }
    return DAYS[todayIndex - 1]; // Monday (1) -> index 0, etc.
};


export const DungeonMap: React.FC = () => {
    const [weekData, setWeekData] = useLocalStorage<WeekData>('dungeonMapData', defaultWeekData);
    const [dungeonLogs, setDungeonLogs] = useLocalStorage<DungeonLog[]>('dungeonLogs', []);
    
    const [currentView, setCurrentView] = useState<'week' | 'day' | 'history'>('week');
    const [selectedDay, setSelectedDay] = useState<string>(getCurrentDayKey());
    const [searchQuery, setSearchQuery] = useState('');
    const [showPRD, setShowPRD] = useState(false);
    const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => getStartOfWeek(new Date()));
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const [year, month, day] = e.target.value.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            setWeekStartDate(getStartOfWeek(localDate));
        }
    };

    const formatDateForInput = (date: Date): string => {
        return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
    };

    const filterBlocks = (blocks: ScheduleBlock[]) => {
        if (!searchQuery) return blocks;
        return blocks.filter(
            (block) =>
                block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                block.note.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const addNewBlock = (dayKey: string) => {
        const newBlock: ScheduleBlock = {
            id: `${dayKey}-${Date.now()}`, name: 'New Quest', startTime: '09:00', endTime: '10:00',
            emoji: '⭐', note: '', done: false, blockType: 'Focus', energyLevel: 'High',
        };
        setWeekData((prev) => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], blocks: [...prev[dayKey].blocks, newBlock] },
        }));
    };
    
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
                                energyLevel: getEnergyValue(block.blockType), blockType: block.blockType,
                            };
                            setDungeonLogs((prevLogs) => [log, ...prevLogs]);
                        }
                        return updatedBlock;
                    }
                    return block;
                }),
            },
        }));
    };

    const saveBlockEdit = (updatedBlock: ScheduleBlock) => {
        const dayKey = Object.keys(weekData).find((key) =>
            weekData[key].blocks.some((block) => block.id === updatedBlock.id)
        );
        if (dayKey) {
            setWeekData((prev) => ({
                ...prev,
                [dayKey]: {
                    ...prev[dayKey],
                    blocks: prev[dayKey].blocks.map((block) =>
                        block.id === updatedBlock.id ? updatedBlock : block
                    ),
                },
            }));
        }
        setIsEditDialogOpen(false);
        setEditingBlock(null);
    };

    const exportData = () => {
        const dataStr = JSON.stringify({ weekData, dungeonLogs }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'personal-management-data.json';
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const exportLogs = () => {
        const dataStr = JSON.stringify(dungeonLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dungeon-logs.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importLogs = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('This will merge the imported logs with your current logs. Continue?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read");
                const importedLogs: DungeonLog[] = JSON.parse(text);
                
                if (!Array.isArray(importedLogs) || (importedLogs.length > 0 && !importedLogs[0].id)) {
                    alert('Invalid file format.');
                    return;
                }
                
                const combinedLogs = [...importedLogs, ...dungeonLogs];
                const uniqueLogs = Array.from(new Map(combinedLogs.map(log => [log.id, log])).values());
                
                setDungeonLogs(uniqueLogs);
                alert('Logs imported successfully!');
            } catch (error) {
                console.error("Failed to import logs:", error);
                alert('Failed to import logs. Please check the file format.');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const resetData = () => {
        if (confirm('Are you sure you want to reset all schedule data to defaults?')) {
            setWeekData(defaultWeekData);
            setDungeonLogs([]);
        }
    };

    const printView = () => window.print();

    const generateAISchedule = async () => {
        if (!confirm('This will replace your current schedule with an AI-generated one. Are you sure?')) {
            return;
        }
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const scheduleBlockSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'The name of the schedule block or quest.' },
                    startTime: { type: Type.STRING, description: "The start time in HH:MM format." },
                    endTime: { type: Type.STRING, description: "The end time in HH:MM format." },
                    emoji: { type: Type.STRING, description: "A single emoji representing the block." },
                    note: { type: Type.STRING, description: 'A short note or description for the block.' },
                    blockType: { type: Type.STRING, description: "The type of block. Must be one of: Focus, Recovery, Flow, Admin, Social." },
                    energyLevel: { type: Type.STRING, description: "The expected energy level. Must be one of: High, Moderate, Low, Recharge." }
                },
            };
            const dayDataSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    theme: { type: Type.STRING },
                    blocks: { type: Type.ARRAY, items: scheduleBlockSchema }
                },
            };
            const weekDataSchema = {
                type: Type.OBJECT,
                properties: {
                    monday: dayDataSchema, tuesday: dayDataSchema, wednesday: dayDataSchema,
                    thursday: dayDataSchema, friday: dayDataSchema, saturday: dayDataSchema, sunday: dayDataSchema
                },
            };
            
            const prompt = "Generate a creative and productive weekly schedule with an RPG theme. Your response must be a JSON object that adheres to the provided schema. For each day from monday to sunday, create a thematic `title` and `theme` description. Populate the `blocks` array for each day with 2 to 4 schedule blocks. Ensure each block includes `name`, `startTime`, `endTime`, `emoji`, `note`, a `blockType` from ['Focus', 'Recovery', 'Flow', 'Admin', 'Social'], and an `energyLevel` from ['High', 'Moderate', 'Low', 'Recharge']. The schedule should be well-balanced, incorporating periods of intense work with adequate rest and recovery.";

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: weekDataSchema,
                },
            });

            const jsonText = response.text.trim();
            const generatedData = JSON.parse(jsonText);

            const newWeekData: WeekData = { ...defaultWeekData };
            for (const dayKey of DAYS) {
                if (generatedData[dayKey] && generatedData[dayKey].blocks) {
                    newWeekData[dayKey] = {
                        title: generatedData[dayKey].title || `Title for ${dayKey}`,
                        theme: generatedData[dayKey].theme || `Theme for ${dayKey}`,
                        blocks: generatedData[dayKey].blocks.map((block: any, index: number) => ({
                            ...block,
                            id: `${dayKey}-${Date.now()}-${index}`,
                            done: false,
                        })),
                    };
                }
            }
            
            setWeekData(newWeekData);
            alert('New AI-powered schedule generated successfully!');

        } catch (error) {
            console.error("AI schedule generation failed:", error);
            alert("Sorry, I couldn't generate a new schedule. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'week' | 'day' | 'history')}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="week"><MapPin className="w-4 h-4 mr-2" />Week View</TabsTrigger>
                    <TabsTrigger value="day"><Calendar className="w-4 h-4 mr-2" />Day View</TabsTrigger>
                    <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />History & Logs</TabsTrigger>
                </TabsList>

                <div className="flex flex-wrap gap-4 my-6 justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <Label htmlFor="week-start-date" className="mb-0 shrink-0">Week of:</Label>
                        <Input
                            id="week-start-date"
                            type="date"
                            value={formatDateForInput(weekStartDate)}
                            onChange={handleDateChange}
                            className="w-auto"
                        />
                    </div>
                    <div className="flex-grow flex justify-end items-center gap-4 flex-wrap">
                        <div className="relative max-w-xs flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input placeholder="Search blocks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-full" />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={generateAISchedule} disabled={isGenerating}>
                                {isGenerating ? (
                                    <><RotateCcw className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>
                                )}
                            </Button>
                            <Button variant="outline" onClick={exportData}><Download className="w-4 h-4 mr-2" />Export</Button>
                            <Button variant="outline" onClick={resetData}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
                            <Button variant="outline" onClick={printView}><Printer className="w-4 h-4 mr-2" />Print</Button>
                        </div>
                    </div>
                </div>

                <Collapsible open={showPRD} onOpenChange={setShowPRD} className="mb-6">
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-transparent">
                            <span>📋 Feel-Good Schedule Block System</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showPRD ? 'rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <Card className="mt-2">
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold mb-3">🎯 Core Principles</h3>
                                        <ul className="space-y-2 text-sm list-disc list-inside">
                                            <li>Match high-energy hours to deep work</li>
                                            <li>Insert recovery blocks to avoid burnout</li>
                                            <li>Batch similar tasks to reduce context switching</li>
                                            <li>End with closure blocks for reflection</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-3">🔋 Energy Levels</h3>
                                        <div className="space-y-2 text-sm">
                                            <div><Badge variant="destructive">High</Badge> - Deep focus work</div>
                                            <div><Badge variant="default">Moderate</Badge> - Regular tasks</div>
                                            <div><Badge variant="secondary">Low</Badge> - Light activities</div>
                                            <div><Badge variant="outline">Recharge</Badge> - Rest & recovery</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                </Collapsible>

                <TabsContent value="history">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap justify-between items-center gap-4">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />📜 Dungeon Completion History</CardTitle>
                                        <CardDescription>Track your completed quests and productivity patterns</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="file" id="import-logs-input" accept=".json" onChange={importLogs} className="hidden" />
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('import-logs-input')?.click()}>
                                            <Upload className="w-4 h-4 mr-2" />Import
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={exportLogs}>
                                            <Download className="w-4 h-4 mr-2" />Export
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {dungeonLogs.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No completed blocks yet. Start conquering your dungeon!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                        {dungeonLogs.slice(0, 50).map((log) => (
                                            <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
                                                <div className="flex-1">
                                                    <div className="font-medium">{log.blockName}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{log.day.charAt(0).toUpperCase() + log.day.slice(1)} • {log.blockType}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">{new Date(log.completedAt).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.completedAt).toLocaleTimeString()}</div>
                                                </div>
                                                <div className="ml-4"><Badge variant="outline">⚡ {log.energyLevel}</Badge></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* Stats Cards */}
                    </div>
                </TabsContent>

                <TabsContent value="week">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {DAYS.map((dayKey, index) => {
                            const day = weekData[dayKey];
                            const filteredBlocks = filterBlocks(day.blocks);
                            const currentDate = new Date(weekStartDate);
                            currentDate.setDate(weekStartDate.getDate() + index);
                            return (
                                <Card key={dayKey} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span>{DAY_NAMES[index]}</span>
                                                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                                        {currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => addNewBlock(dayKey)}><Plus className="w-4 h-4" /></Button>
                                            </div>
                                        </CardTitle>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{day.theme}</div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {filteredBlocks.map((block) => (
                                            <div key={block.id} className={`p-3 rounded-lg border ${block.done ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-800"}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={block.done} onCheckedChange={() => handleToggleBlockDone(dayKey, block.id)} />
                                                        <span className="text-lg">{block.emoji}</span>
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => { setEditingBlock(block); setIsEditDialogOpen(true); }}><Edit className="w-3 h-3" /></Button>
                                                </div>
                                                <div className={`${block.done ? "line-through opacity-60" : ""}`}>
                                                    <div className="font-medium text-sm mb-1">{block.name}</div>
                                                    <div className="text-xs text-gray-500 mb-2">{block.startTime} - {block.endTime}</div>
                                                    <div className="flex gap-1 mb-2">
                                                        <Badge variant="outline" className="text-xs">{block.blockType}</Badge>
                                                        <Badge variant={block.energyLevel === "High" ? "destructive" : block.energyLevel === "Moderate" ? "default" : block.energyLevel === "Low" ? "secondary" : "outline"} className="text-xs">{block.energyLevel}</Badge>
                                                    </div>
                                                    {block.note && <div className="text-xs text-gray-600 dark:text-gray-400">{block.note}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="day">
                     <div className="mb-4">
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger className="w-auto min-w-[240px]">
                                <SelectValue>
                                    {(() => {
                                        const dayIndex = DAYS.indexOf(selectedDay);
                                        const currentDate = new Date(weekStartDate);
                                        currentDate.setDate(weekStartDate.getDate() + dayIndex);
                                        return `${DAY_NAMES[dayIndex]} (${currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}) - ${weekData[selectedDay].title}`;
                                    })()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map((dayKey, index) => {
                                    const currentDate = new Date(weekStartDate);
                                    currentDate.setDate(weekStartDate.getDate() + index);
                                    return (
                                        <SelectItem key={dayKey} value={dayKey}>
                                            {DAY_NAMES[index]} ({currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}) - {weekData[dayKey].title}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{weekData[selectedDay].theme}</span>
                                <Button onClick={() => addNewBlock(selectedDay)}><Plus className="w-4 h-4 mr-2" />Add Block</Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filterBlocks(weekData[selectedDay].blocks).map((block) => (
                                    <Card key={block.id} className={block.done ? "bg-green-50 dark:bg-green-900/20" : ""}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <Checkbox checked={block.done} onCheckedChange={() => handleToggleBlockDone(selectedDay, block.id)} className="mt-1"/>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-2xl">{block.emoji}</span>
                                                            <h3 className={`font-semibold ${block.done ? "line-through opacity-60" : ""}`}>{block.name}</h3>
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{block.startTime} - {block.endTime}</div>
                                                        <div className="flex gap-2 mb-2">
                                                            <Badge variant="outline">{block.blockType}</Badge>
                                                            <Badge variant={block.energyLevel === "High" ? "destructive" : block.energyLevel === "Moderate" ? "default" : block.energyLevel === "Low" ? "secondary" : "outline"}>{block.energyLevel}</Badge>
                                                        </div>
                                                        {block.note && <p className={`text-sm ${block.done ? "line-through opacity-60" : ""}`}>{block.note}</p>}
                                                        {block.reflectionNote && <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm"><strong>Reflection:</strong> {block.reflectionNote}</div>}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingBlock(block); setIsEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {editingBlock && (
                <EditBlockDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    block={editingBlock}
                    onSave={saveBlockEdit}
                    onCancel={() => {
                        setIsEditDialogOpen(false);
                        setEditingBlock(null);
                    }}
                />
            )}
        </>
    );
};
