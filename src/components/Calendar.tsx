import React from 'react';

interface CalendarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export default function Calendar({ selectedDate, setSelectedDate }: CalendarProps) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(i + 1);
    return d.toISOString().split('T')[0];
  });

  return (
    <div>
      <h3>Kalendarz</h3>
      {days.map(day => (
        <div
          key={day}
          style={{
            padding: '5px',
            margin: '2px',
            cursor: 'pointer',
            backgroundColor: day === selectedDate ? '#ddd' : '#fff'
          }}
          onClick={() => setSelectedDate(day)}
        >
          {day}
        </div>
      ))}
    </div>
  );
}
