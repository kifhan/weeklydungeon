import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Card as KanbanCard } from '../services/firestore';

interface EditCardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: KanbanCard;
  onSave: (card: KanbanCard) => void;
  onCancel: () => void;
}

export const EditCardDialog: React.FC<EditCardDialogProps> = ({
  isOpen,
  onOpenChange,
  card,
  onSave,
  onCancel,
}) => {
  const [editedCard, setEditedCard] = useState<KanbanCard>(card);

  useEffect(() => {
    setEditedCard(card);
  }, [card]);

  const handleSave = () => {
    onSave(editedCard);
  };

  const handleChange = <K extends keyof KanbanCard,>(key: K, value: KanbanCard[K]) => {
    setEditedCard((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Quest</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editedCard.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emoji">Emoji</Label>
            <Input
              id="emoji"
              value={editedCard.emoji || ''}
              onChange={(e) => handleChange('emoji', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={editedCard.startTime || ''}
                onChange={(e) => handleChange('startTime', e.target.value || null)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={editedCard.endTime || ''}
                onChange={(e) => handleChange('endTime', e.target.value || null)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="blockType">Block Type</Label>
            <Select
              value={editedCard.blockType || 'Focus'}
              onValueChange={(value) => handleChange('blockType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Focus">Focus</SelectItem>
                <SelectItem value="Recovery">Recovery</SelectItem>
                <SelectItem value="Flow">Flow</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Social">Social</SelectItem>
                <SelectItem value="Rest">Rest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="energyLevel">Energy Level</Label>
            <Select
              value={editedCard.energyLevel || 'Moderate'}
              onValueChange={(value) => handleChange('energyLevel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Recharge">Recharge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={editedCard.note || ''}
              onChange={(e) => handleChange('note', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reflectionNote">Reflection Note</Label>
            <Textarea
              id="reflectionNote"
              value={editedCard.reflectionNote || ''}
              onChange={(e) => handleChange('reflectionNote', e.target.value || null)}
              placeholder="End-of-day reflection..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
