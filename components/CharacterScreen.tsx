import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Label } from './ui/Label';
import { Badge } from './ui/Badge';
import { Sparkles, Save, User, Wand2 } from 'lucide-react';
import { CharacterProfile, CharacterTrait } from '../types';
import { saveCharacterProfile, listenCharacterProfile } from '../services/firestore';
import { GoogleGenAI } from '@google/genai';

interface CharacterScreenProps {
    uid: string;
}

const TRAITS: CharacterTrait[] = [
    "Stoic", "Cheerleader", "Mystical", "Tough Love",
    "Analytical", "Poetic", "Chaotic Good", "Zen Master"
];

export const CharacterScreen: React.FC<CharacterScreenProps> = ({ uid }) => {
    const [profile, setProfile] = useState<CharacterProfile>({
        name: '',
        traits: [],
        generatedPrompt: '',
        customInstructions: ''
    });
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!uid) return;
        const unsub = listenCharacterProfile(uid, (data) => {
            if (data) {
                setProfile(prev => ({ ...prev, ...data }));
            }
        });
        return () => unsub();
    }, [uid]);

    const toggleTrait = (trait: CharacterTrait) => {
        setProfile(prev => {
            const traits = prev.traits.includes(trait)
                ? prev.traits.filter(t => t !== trait)
                : [...prev.traits, trait];
            return { ...prev, traits };
        });
    };

    const generatePersona = async () => {
        if (profile.traits.length === 0) {
            alert("Please select at least one trait.");
            return;
        }

        try {
            setGenerating(true);
            const prompt = `You are an expert persona designer.
            Create a system instruction (system prompt) for an AI assistant based on the following traits:
            Traits: ${profile.traits.join(', ')}
            Character Name: ${profile.name || "The Guide"}

            The system prompt should define the AI's tone, style, and personality.
            It should be concise (max 3-4 sentences) and ready to be pasted into a system instruction field.
            Do not include "Here is the prompt:" or quotes. Just the raw prompt text.`;

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = result.text.trim();
            setProfile(prev => ({ ...prev, generatedPrompt: text }));
        } catch (error) {
            console.error("Failed to generate persona:", error);
            alert("Failed to generate persona. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await saveCharacterProfile(uid, profile);
            alert("Character profile saved!");
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <User className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Character Profile</h2>
                    <p className="text-gray-500 dark:text-gray-400">Define your AI companion's personality.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Identity</CardTitle>
                    <CardDescription>Who is guiding you on this journey?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="char-name">Character Name</Label>
                        <Input
                            id="char-name"
                            placeholder="e.g. The Wise Old Owl"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Personality Traits</Label>
                        <div className="flex flex-wrap gap-2">
                            {TRAITS.map(trait => (
                                <Badge
                                    key={trait}
                                    variant={profile.traits.includes(trait) ? "default" : "outline"}
                                    className={`cursor-pointer px-3 py-1 ${profile.traits.includes(trait) ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    onClick={() => toggleTrait(trait)}
                                >
                                    {trait}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AI Persona</CardTitle>
                    <CardDescription>Generate the system prompt that powers your AI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={generatePersona}
                        disabled={generating || profile.traits.length === 0}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                        <Wand2 className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? "Weaving Personality..." : "Generate Persona Prompt"}
                    </Button>

                    <div>
                        <Label htmlFor="gen-prompt">System Prompt</Label>
                        <Textarea
                            id="gen-prompt"
                            value={profile.generatedPrompt}
                            onChange={(e) => setProfile({ ...profile, generatedPrompt: e.target.value })}
                            placeholder="The generated system prompt will appear here..."
                            className="min-h-[100px] font-mono text-sm bg-gray-50 dark:bg-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">You can manually tweak this prompt if you like.</p>
                    </div>

                    <div>
                        <Label htmlFor="custom-instr">Additional Instructions (Optional)</Label>
                        <Textarea
                            id="custom-instr"
                            value={profile.customInstructions || ''}
                            onChange={(e) => setProfile({ ...profile, customInstructions: e.target.value })}
                            placeholder="Any specific rules? e.g. 'Always use emojis', 'Keep it brief'."
                            className="min-h-[80px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading} size="lg">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Saving..." : "Save Profile"}
                </Button>
            </div>
        </div>
    );
};
