import React from 'react';

interface WorkoutInfoProps {
  workout: any;
}

export default function WorkoutInfo({ workout }: WorkoutInfoProps) {
  if (!workout) return <div>Brak info/treningu</div>;

  return (
    <div>
      <h3>Informacje o treningu</h3>
      <p>Poziom: {workout.level}</p>
      <p>Czas trwania: {workout.duration} min</p>
      <p>Godzina: {workout.hour}</p>
      <p>Status: {workout.completed ? 'Zrobione' : 'Nie ukończone'}</p>
    </div>
  );
}
