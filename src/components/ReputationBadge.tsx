import React from 'react';

export interface ReputationBadgeProps {
  reputation: number;
}

const ReputationBadge: React.FC<ReputationBadgeProps> = ({ reputation }) => {
  const colorClass = reputation > 70 ? 'bg-green-100 text-green-800' : reputation > 30 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      Reputation: {reputation}
    </span>
  );
};

export default ReputationBadge;
