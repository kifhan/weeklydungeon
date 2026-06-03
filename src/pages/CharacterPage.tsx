import React, { FormEvent, useEffect, useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';
import {
  buildCharacterPrompt,
  type CharacterArchetype,
  type DungeonProfile,
} from '@/weekly-dungeon/domain/types';

interface CharacterPageProps {
  uid: string;
}

const archetypes: CharacterArchetype[] = ['Guide', 'Strategist', 'Scout', 'Guardian'];

export const CharacterPage: React.FC<CharacterPageProps> = ({ uid }) => {
  const { profile, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [draft, setDraft] = useState<DungeonProfile>(profile);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const traitsText = draft.guideTraits.join(', ');
  const promptPreview = buildCharacterPrompt(draft);

  const updateDraft = (patch: Partial<DungeonProfile>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await actions.updateProfile({
        guideName: draft.guideName.trim() || 'Dungeon Guide',
        guideArchetype: draft.guideArchetype,
        guideTraits: draft.guideTraits,
        guideTone: draft.guideTone.trim(),
        guidePrompt: draft.guidePrompt.trim(),
        adventureIntensity: draft.adventureIntensity,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Character</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <div>
                <Label htmlFor="guide-name">Guide name</Label>
                <Input
                  id="guide-name"
                  value={draft.guideName}
                  onChange={(event) => updateDraft({ guideName: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="guide-archetype">Archetype</Label>
                <Select
                  id="guide-archetype"
                  value={draft.guideArchetype}
                  onValueChange={(value) => updateDraft({ guideArchetype: value as CharacterArchetype })}
                >
                  {archetypes.map((archetype) => (
                    <SelectItem key={archetype} value={archetype}>
                      {archetype}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="adventure-intensity">Intensity</Label>
                <Input
                  id="adventure-intensity"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.adventureIntensity}
                  onChange={(event) =>
                    updateDraft({
                      adventureIntensity: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="guide-traits">Traits</Label>
              <Input
                id="guide-traits"
                value={traitsText}
                onChange={(event) =>
                  updateDraft({
                    guideTraits: event.target.value
                      .split(',')
                      .map((trait) => trait.trim())
                      .filter(Boolean)
                      .slice(0, 8),
                  })
                }
                placeholder="Grounded, Direct, Warm"
              />
            </div>

            <div>
              <Label htmlFor="guide-tone">Tone</Label>
              <Input
                id="guide-tone"
                value={draft.guideTone}
                onChange={(event) => updateDraft({ guideTone: event.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="guide-prompt">Prompt instruction</Label>
              <Textarea
                id="guide-prompt"
                value={draft.guidePrompt}
                onChange={(event) => updateDraft({ guidePrompt: event.target.value })}
                className="min-h-[140px]"
              />
            </div>

            <Button type="submit" className="w-fit gap-2" disabled={busy}>
              <WandSparkles className="h-4 w-4" />
              Save character
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{promptPreview}</p>
        </CardContent>
      </Card>
    </div>
  );
};
