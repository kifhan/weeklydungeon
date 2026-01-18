import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Trash2 } from 'lucide-react';
import { MetaQuestion } from '@/types';
import { addMetaQuestion, deleteMetaQuestion, updateMetaQuestion } from '@/services/firestore';

const META_STATUSES: MetaQuestion['status'][] = ['DRAFT', 'PUBLISH', 'ARCHIVE'];

interface MetaTabProps {
  uid: string;
  metaQuestions: MetaQuestion[];
}

export const MetaTab: React.FC<MetaTabProps> = ({ uid, metaQuestions }) => {
  const [metaPrompt, setMetaPrompt] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [metaStatus, setMetaStatus] = useState<MetaQuestion['status']>('DRAFT');

  const handleCreateMetaQuestion = async () => {
    if (!metaPrompt.trim()) return;
    const tags = metaTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const metaQuestion: MetaQuestion = {
      id: `mq-${crypto.randomUUID()}`,
      basePrompt: metaPrompt.trim(),
      topicTags: tags,
      status: metaStatus,
    };
    await addMetaQuestion(uid, metaQuestion);
    setMetaPrompt('');
    setMetaTags('');
    setMetaStatus('DRAFT');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New Meta Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe how the AI should generate questions..."
            value={metaPrompt}
            onChange={(e) => setMetaPrompt(e.target.value)}
          />
          <Input
            placeholder="Topic tags (comma separated)"
            value={metaTags}
            onChange={(e) => setMetaTags(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={metaStatus} onValueChange={(value) => setMetaStatus(value as MetaQuestion['status'])}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {META_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreateMetaQuestion} disabled={!metaPrompt.trim()}>
              Save Meta Question
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta Question List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metaQuestions.length === 0 && <p className="text-sm text-gray-500">No meta questions yet.</p>}
          {metaQuestions.map((meta) => (
            <div key={meta.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 dark:text-gray-100">{meta.basePrompt}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMetaQuestion(uid, meta.id)}
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {meta.topicTags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{meta.status}</Badge>
                <Select
                  value={meta.status}
                  onValueChange={(value) => updateMetaQuestion(uid, meta.id, { status: value as MetaQuestion['status'] })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {META_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};
