import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Tree } from '../types';
import { Trees } from 'lucide-react';

interface ForestVisualizerProps {
    trees: Tree[];
}

export const ForestVisualizer: React.FC<ForestVisualizerProps> = ({ trees }) => {
    // If no trees, show a starter sapling
    const displayTrees = trees.length > 0 ? trees : [
        { id: 'starter', type: 'shrub', stage: 'sprout', plantedAt: new Date().toISOString() } as Tree
    ];

    return (
        <Card className="w-full bg-gradient-to-b from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 border-none shadow-lg overflow-hidden relative">
            <CardHeader className="relative z-10 pb-2">
                <CardTitle className="text-green-800 dark:text-green-100 flex items-center gap-2">
                    <Trees className="w-6 h-6" />
                    Your Forest
                </CardTitle>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {trees.length} {trees.length === 1 ? 'tree' : 'trees'} planted
                </p>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="flex flex-wrap gap-1 mt-2">
                    {displayTrees.map((tree) => {
                        const tooltipText = [
                            `${tree.type.charAt(0).toUpperCase() + tree.type.slice(1)} (${tree.stage})`,
                            new Date(tree.plantedAt).toLocaleDateString(),
                            tree.linkedQuestId ? `Quest: ${tree.linkedQuestId}` : tree.linkedHabitId ? `Journal Entry` : ''
                        ].filter(Boolean).join(' • ');

                        const getTreeEmoji = (type: string, stage: string) => {
                            if (stage === 'seed') return '🌱';
                            if (stage === 'sprout') return '🌿';
                            if (type === 'pine') return '🌲';
                            if (type === 'cherry') return '🌸';
                            if (type === 'oak') return '🌳';
                            return '🪴';
                        };

                        return (
                            <div
                                key={tree.id}
                                className="group relative"
                                title={tooltipText}
                            >
                                <div
                                    className={`w-3 h-3 rounded-sm transition-all duration-200 group-hover:scale-125 ${getTreeColor(tree.type, tree.stage)}`}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                    <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-2 rounded shadow-lg">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <span className="text-base">{getTreeEmoji(tree.type, tree.stage)}</span>
                                            <span>{tree.type.charAt(0).toUpperCase() + tree.type.slice(1)}</span>
                                        </div>
                                        <div className="text-gray-300 dark:text-gray-600 mt-1">{tree.stage} • {new Date(tree.plantedAt).toLocaleDateString()}</div>
                                        {tree.linkedQuestId && <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">⚔️ Quest completed</div>}
                                        {tree.linkedHabitId && <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">📖 Journal entry</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>

            {/* Background Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-green-200 dark:bg-green-900/50 rounded-t-[50%] transform scale-150 translate-y-10 blur-xl"></div>
        </Card>
    );
};


const getTreeColor = (type: string, stage: string): string => {
    // Different shades based on tree type and stage
    const colorMap: Record<string, Record<string, string>> = {
        pine: {
            seed: 'bg-green-200 dark:bg-green-900',
            sprout: 'bg-green-400 dark:bg-green-700',
            sapling: 'bg-green-600 dark:bg-green-500',
            mature: 'bg-green-800 dark:bg-green-300'
        },
        oak: {
            seed: 'bg-emerald-200 dark:bg-emerald-900',
            sprout: 'bg-emerald-400 dark:bg-emerald-700',
            sapling: 'bg-emerald-600 dark:bg-emerald-500',
            mature: 'bg-emerald-800 dark:bg-emerald-300'
        },
        cherry: {
            seed: 'bg-pink-200 dark:bg-pink-900',
            sprout: 'bg-pink-400 dark:bg-pink-700',
            sapling: 'bg-pink-600 dark:bg-pink-500',
            mature: 'bg-pink-800 dark:bg-pink-300'
        },
        shrub: {
            seed: 'bg-lime-200 dark:bg-lime-900',
            sprout: 'bg-lime-400 dark:bg-lime-700',
            sapling: 'bg-lime-600 dark:bg-lime-500',
            mature: 'bg-lime-800 dark:bg-lime-300'
        }
    };

    return colorMap[type]?.[stage] || 'bg-green-500 dark:bg-green-500';
};

