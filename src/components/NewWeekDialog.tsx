import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Calendar, Sparkles } from 'lucide-react';

interface NewWeekDialogProps {
    isOpen: boolean;
    weekStartDate: Date;
    weekEndDate: Date;
    onGenerateQuests: () => void;
    onSkip: () => void;
    isGenerating: boolean;
}

const formatDateRange = (start: Date, end: Date): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};

export const NewWeekDialog: React.FC<NewWeekDialogProps> = ({
    isOpen,
    weekStartDate,
    weekEndDate,
    onGenerateQuests,
    onSkip,
    isGenerating
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onSkip()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Calendar className="w-6 h-6 text-purple-600" />
                        Welcome to a New Week! 🎉
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        <span className="font-semibold text-purple-600">
                            {formatDateRange(weekStartDate, weekEndDate)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        A fresh week awaits! Would you like me to generate <span className="font-semibold text-purple-600">3 AI-powered quests</span> for each day of the week?
                    </p>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                <p className="font-semibold mb-1">What you'll get:</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                    <li>21 personalized quests (3 per day)</li>
                                    <li>Aligned with each day's theme</li>
                                    <li>Balanced energy levels and types</li>
                                    <li>Ready to customize or use as-is</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={onSkip}
                        disabled={isGenerating}
                        className="flex-1"
                    >
                        Skip, I'll add my own
                    </Button>
                    <Button
                        onClick={onGenerateQuests}
                        disabled={isGenerating}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Sparkles className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Generating...' : 'Generate Quests'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
