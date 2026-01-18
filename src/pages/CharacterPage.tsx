import React from 'react';
import { CharacterScreen } from '@/components/CharacterScreen';

interface CharacterPageProps {
  uid: string;
}

export const CharacterPage: React.FC<CharacterPageProps> = ({ uid }) => {
  return <CharacterScreen uid={uid} />;
};
