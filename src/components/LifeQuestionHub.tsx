import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Sparkles } from 'lucide-react';
import { useLifeQuestions } from '@/hooks/useLifeQuestions';
import { InboxTab } from './life/InboxTab';
import { QuestionsTab } from './life/QuestionsTab';
import { MetaTab } from './life/MetaTab';
import { ScheduleTab } from './life/ScheduleTab';
import { HistoryTab } from './life/HistoryTab';
import { SettingsTab } from './life/SettingsTab';

const LIFE_TABS = ['inbox', 'questions', 'meta', 'schedule', 'history', 'settings'] as const;

interface LifeQuestionHubProps {
  uid: string;
}

export const LifeQuestionHub: React.FC<LifeQuestionHubProps> = ({ uid }) => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: typeof LIFE_TABS[number] = LIFE_TABS.includes(tab as typeof LIFE_TABS[number])
    ? (tab as typeof LIFE_TABS[number])
    : 'inbox';

  const {
    questions,
    metaQuestions,
    reservations,
    answers,
    settings,
    notificationEnabled,
    questionLookup,
    metaLookup,
    pendingDeliveries,
    upcomingReservations,
  } = useLifeQuestions(uid);

  const [notificationEnabledState, setNotificationEnabledState] = useState(notificationEnabled);

  useEffect(() => {
    if (!tab || !LIFE_TABS.includes(tab as typeof LIFE_TABS[number])) {
      navigate('/life/inbox', { replace: true });
    }
  }, [navigate, tab]);

  useEffect(() => {
    setNotificationEnabledState(notificationEnabled);
  }, [notificationEnabled]);

  return (
    <Card className="border-2 border-blue-100 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          Life Question Bot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => navigate(`/life/${value}`)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="meta">Meta</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-6 space-y-6">
            <InboxTab
              uid={uid}
              pendingDeliveries={pendingDeliveries}
              upcomingReservations={upcomingReservations}
              questionLookup={questionLookup}
              metaLookup={metaLookup}
              notificationEnabled={notificationEnabledState}
              onNotificationEnabledChange={setNotificationEnabledState}
              questions={questions}
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-6 space-y-6">
            <QuestionsTab uid={uid} questions={questions} />
          </TabsContent>

          <TabsContent value="meta" className="mt-6 space-y-6">
            <MetaTab uid={uid} metaQuestions={metaQuestions} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6 space-y-6">
            <ScheduleTab
              uid={uid}
              questions={questions}
              metaQuestions={metaQuestions}
              reservations={reservations}
              questionLookup={questionLookup}
              metaLookup={metaLookup}
              settings={settings}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-6">
            <HistoryTab answers={answers} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <SettingsTab
              uid={uid}
              settings={settings}
              notificationEnabled={notificationEnabledState}
              onNotificationEnabledChange={setNotificationEnabledState}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
