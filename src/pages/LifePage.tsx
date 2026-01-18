import React from 'react';
import { LifeQuestionHub } from '@/components/LifeQuestionHub';

interface LifePageProps {
  uid: string;
}

export const LifePage: React.FC<LifePageProps> = ({ uid }) => {
  return <LifeQuestionHub uid={uid} />;
};
