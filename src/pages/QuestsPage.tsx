import React, { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';
import {
  currentQuestDay,
  questDays,
  type Quest,
  type QuestDay,
  type QuestDifficulty,
  type QuestStatus,
} from '@/weekly-dungeon/domain/types';

interface QuestsPageProps {
  uid: string;
}

const statusOrder: QuestStatus[] = ['active', 'planned', 'complete'];

export const QuestsPage: React.FC<QuestsPageProps> = ({ uid }) => {
  const { quests, loading, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [reward, setReward] = useState('');
  const [day, setDay] = useState<QuestDay>(currentQuestDay());
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('standard');
  const [busy, setBusy] = useState(false);

  const questsByStatus = useMemo(() => {
    return statusOrder.reduce<Record<QuestStatus, Quest[]>>(
      (groups, status) => ({
        ...groups,
        [status]: quests.filter((quest) => quest.status === status),
      }),
      { planned: [], active: [], complete: [] }
    );
  }, [quests]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setBusy(true);
    try {
      await actions.addQuest({
        title: trimmedTitle,
        note: note.trim(),
        reward: reward.trim(),
        day,
        difficulty,
        sortOrder: Date.now(),
      });
      setTitle('');
      setNote('');
      setReward('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quests</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
              <div>
                <Label htmlFor="quest-title">Title</Label>
                <Input
                  id="quest-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Name the quest"
                />
              </div>
              <div>
                <Label htmlFor="quest-day">Day</Label>
                <Select id="quest-day" value={day} onValueChange={(value) => setDay(value as QuestDay)}>
                  {questDays.map((questDay) => (
                    <SelectItem key={questDay} value={questDay}>
                      {questDay}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="quest-difficulty">Difficulty</Label>
                <Select
                  id="quest-difficulty"
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as QuestDifficulty)}
                >
                  <SelectItem value="calm">calm</SelectItem>
                  <SelectItem value="standard">standard</SelectItem>
                  <SelectItem value="boss">boss</SelectItem>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Notes, constraints, or first action"
              />
              <Input
                value={reward}
                onChange={(event) => setReward(event.target.value)}
                placeholder="Reward"
              />
            </div>
            <Button type="submit" className="w-fit gap-2" disabled={busy || !title.trim()}>
              <Plus className="h-4 w-4" />
              Add quest
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {statusOrder.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="capitalize">{status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && questsByStatus[status].length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
              {!loading && questsByStatus[status].length === 0 && (
                <p className="text-sm text-gray-500">No {status} quests.</p>
              )}
              {questsByStatus[status].map((quest) => (
                <article key={quest.id} className="space-y-3 rounded-md border p-4 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{quest.title}</h2>
                      {quest.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{quest.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => actions.removeQuest(quest.id)}>
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{quest.day}</Badge>
                    <Badge>{quest.difficulty}</Badge>
                    {quest.reward && <Badge variant="outline">{quest.reward}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => actions.advanceQuest(quest)} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Advance
                    </Button>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
