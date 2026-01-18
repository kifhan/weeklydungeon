
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { ScheduleBlock, BlockType, EnergyLevel } from '../types';

interface EditBlockDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  block: ScheduleBlock;
  onSave: (block: ScheduleBlock) => void;
  onCancel: () => void;
}

export const EditBlockDialog: React.FC<EditBlockDialogProps> = ({ isOpen, onOpenChange, block, onSave, onCancel }) => {
  const [editedBlock, setEditedBlock] = useState<ScheduleBlock>(block);

  useEffect(() => {
    setEditedBlock(block);
  }, [block]);

  const handleSave = () => {
    onSave(editedBlock);
  };

  const handleChange = <K extends keyof ScheduleBlock,>(key: K, value: ScheduleBlock[K]) => {
    setEditedBlock(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={editedBlock.name} onChange={(e) => handleChange('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" value={editedBlock.startTime} onChange={(e) => handleChange('startTime', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" value={editedBlock.endTime} onChange={(e) => handleChange('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="emoji">Emoji</Label>
            <Input id="emoji" value={editedBlock.emoji} onChange={(e) => handleChange('emoji', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="blockType">Block Type</Label>
            <Select value={editedBlock.blockType} onValueChange={(value) => handleChange('blockType', value as BlockType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Focus">Focus</SelectItem><SelectItem value="Recovery">Recovery</SelectItem>
                <SelectItem value="Flow">Flow</SelectItem><SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="energyLevel">Energy Level</Label>
            <Select value={editedBlock.energyLevel} onValueChange={(value) => handleChange('energyLevel', value as EnergyLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem><SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Low">Low</SelectItem><SelectItem value="Recharge">Recharge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={editedBlock.note} onChange={(e) => handleChange('note', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reflectionNote">Reflection Note</Label>
            <Textarea id="reflectionNote" value={editedBlock.reflectionNote || ""} onChange={(e) => handleChange('reflectionNote', e.target.value)} placeholder="End-of-day reflection..." />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
