import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Settings, Bell } from 'lucide-react';
import { LifeQuestionSettings } from '@/types';
import { saveLifeQuestionSettings } from '@/services/firestore';
import { requestNotificationPermission } from '@/services/fcm';

interface SettingsTabProps {
  uid: string;
  settings: LifeQuestionSettings;
  notificationEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  uid,
  settings,
  notificationEnabled,
  onNotificationEnabledChange,
}) => {
  const [settingsDraft, setSettingsDraft] = useState(settings.timezone);

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        onNotificationEnabledChange(true);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft.trim()) return;
    const updated = { ...settings, timezone: settingsDraft.trim() };
    await saveLifeQuestionSettings(uid, updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input
            value={settingsDraft}
            onChange={(e) => setSettingsDraft(e.target.value)}
            placeholder="Asia/Seoul"
          />
          <p className="text-xs text-gray-500">
            Current: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Notifications</Label>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {notificationEnabled ? 'Enabled' : 'Disabled'}
            </span>
            {!notificationEnabled && (
              <Button onClick={handleEnableNotifications} variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Enable
              </Button>
            )}
          </div>
        </div>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </CardContent>
    </Card>
  );
};
