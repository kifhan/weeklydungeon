import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Settings, Bell } from "lucide-react";
import { saveLifeQuestionSettings } from "../api";
import type { LifeQuestionSettings } from "../types";
import { requestNotificationPermission } from "@/services/fcm";

interface SettingsTabProps {
  uid: string;
  settings: LifeQuestionSettings;
  notificationEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
}

export function SettingsTab({
  uid,
  settings,
  notificationEnabled,
  onNotificationEnabledChange,
}: SettingsTabProps) {
  const [settingsDraft, setSettingsDraft] = useState(settings.timezone);

  useEffect(() => {
    setSettingsDraft(settings.timezone);
  }, [settings.timezone]);

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        onNotificationEnabledChange(true);
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft.trim()) {
      return;
    }

    await saveLifeQuestionSettings(uid, {
      timezone: settingsDraft.trim(),
      notificationChannel: settings.notificationChannel ?? null,
    });
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
            onChange={(event) => setSettingsDraft(event.target.value)}
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
              {notificationEnabled ? "Enabled" : "Disabled"}
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
}
