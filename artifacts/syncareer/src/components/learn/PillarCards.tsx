import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { PillarScore } from '@/hooks/useCareerReadiness';

interface PillarCardsProps {
  pillars: PillarScore[];
}

const PillarCards: React.FC<PillarCardsProps> = ({ pillars }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {pillars.map((pillar) => (
        <Card key={pillar.name}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-baseline justify-between mb-1">
              <h4 className="text-sm font-medium truncate pr-2">{pillar.name}</h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {Math.round(pillar.weight * 100)}% weight
              </span>
            </div>
            <p className="text-2xl font-bold mb-1">{pillar.score}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mb-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pillar.score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pillar.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PillarCards;
