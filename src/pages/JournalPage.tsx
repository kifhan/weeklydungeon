import React, { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';
import type { HabitCadence } from '@/weekly-dungeon/domain/types';

interface JournalPageProps {
  uid: string;
}

function localDateKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export const JournalPage: React.FC<JournalPageProps> = ({ uid }) => {
  const { habits, habitLogs, loading, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [busy, setBusy] = useState(false);

  const today = localDateKey();
  const todaysLogs = useMemo(() => {
    return new Map(habitLogs.filter((log) => log.date === today).map((log) => [log.habitId, log]));
  }, [habitLogs, today]);
  const activeHabits = habits.filter((habit) => habit.status !== 'archived');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedTarget = target.trim();
    if (!trimmedName || !trimmedTarget) return;

    setBusy(true);
    try {
      await actions.addHabit({
        name: trimmedName,
        target: trimmedTarget,
        description: description.trim(),
        cadence,
      });
      setName('');
      setTarget('');
      setDescription('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Habits</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_150px]">
              <div>
                <Label htmlFor="habit-name">Habit</Label>
                <Input
                  id="habit-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Morning check-in"
                />
              </div>
              <div>
                <Label htmlFor="habit-target">Target</Label>
                <Input
                  id="habit-target"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="Before work"
                />
              </div>
              <div>
                <Label htmlFor="habit-cadence">Cadence</Label>
                <Select id="habit-cadence" value={cadence} onValueChange={(value) => setCadence(value as HabitCadence)}>
                  <SelectItem value="daily">daily</SelectItem>
                  <SelectItem value="weekly">weekly</SelectItem>
                </Select>
              </div>
            </div>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes for this habit"
            />
            <Button type="submit" className="w-fit gap-2" disabled={busy || !name.trim() || !target.trim()}>
              <Plus className="h-4 w-4" />
              Add habit
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <CardContent className="pt-6 text-sm">{error.message}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && activeHabits.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
          {!loading && activeHabits.length === 0 && <p className="text-sm text-gray-500">No active habits yet.</p>}
          {activeHabits.map((habit) => {
            const log = todaysLogs.get(habit.id);
            const checked = !!log?.checked;
            return (
              <article key={habit.id} className="rounded-md border p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{habit.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{habit.target}</p>
                    {habit.description && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{habit.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => actions.removeHabit(habit.id)}>
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant={checked ? 'secondary' : 'default'}
                    onClick={() =>
                      actions.checkHabit({
                        habitId: habit.id,
                        date: today,
                        checked: !checked,
                      })
                    }
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {checked ? 'Checked' : 'Check'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => actions.patchHabit(habit.id, { status: 'archived' })}
                  >
                    Archive
                  </Button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
