import React from 'react';

interface StatsProps {
  stats: any;
}

export default function Stats({ stats }: StatsProps) {
  return (
    <div>
      <h3>Statystyki aplikacji</h3>
      <p>Liczba użytkowników: {stats.users}</p>
      <p>Liczba adminów: {stats.admins}</p>
    </div>
  );
}
