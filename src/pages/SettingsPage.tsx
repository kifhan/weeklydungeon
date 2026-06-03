import React, { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectItem } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useDungeonActions } from '@/weekly-dungeon/hooks/useDungeonActions';
import { useDungeonData } from '@/weekly-dungeon/hooks/useDungeonData';
import type { DungeonProfile, NotificationChannel } from '@/weekly-dungeon/domain/types';

interface SettingsPageProps {
  uid: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ uid }) => {
  const { profile, error } = useDungeonData(uid);
  const actions = useDungeonActions(uid);
  const [draft, setDraft] = useState<DungeonProfile>(profile);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await actions.updateProfile({
        timezone: draft.timezone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
        notificationChannel: draft.notificationChannel,
        remindersEnabled: draft.remindersEnabled,
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
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={draft.timezone}
                  onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="Asia/Seoul"
                />
              </div>
              <div>
                <Label htmlFor="notification-channel">Notification channel</Label>
                <Select
                  id="notification-channel"
                  value={draft.notificationChannel}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, notificationChannel: value as NotificationChannel }))
                  }
                >
                  <SelectItem value="in-app">in-app</SelectItem>
                  <SelectItem value="push">push</SelectItem>
                  <SelectItem value="email">email</SelectItem>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={draft.remindersEnabled}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, remindersEnabled: Boolean(checked) }))
                }
              />
              Reminders enabled
            </label>

            <Button type="submit" className="w-fit gap-2" disabled={busy}>
              <Save className="h-4 w-4" />
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cleanup policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Legacy Firestore collections remain untouched by the app. Cleanup is handled only by an explicit dry-run
            script with confirmation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
