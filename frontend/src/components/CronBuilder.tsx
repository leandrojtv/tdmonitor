import { useEffect, useMemo, useState } from 'react';
import parser from 'cron-parser';

type FrequencyMode = 'minutes' | 'hours' | 'daily' | 'weekly' | 'custom';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const minutePresets = [5, 15, 30];
const hourPresets = [1, 2, 6, 12, 24];

const weekdays = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 }
];

export function cronToPortuguese(cron: string): string {
  if (/^\*\/\d+ \* \* \* \*$/.test(cron)) {
    const n = cron.split('/')[1].split(' ')[0];
    return `A cada ${n} minutos`;
  }

  if (/^0 \*\/\d+ \* \* \*$/.test(cron)) {
    const n = cron.split('*/')[1].split(' ')[0];
    return `A cada ${n} horas`;
  }

  if (/^\d+ \d+ \* \* \*$/.test(cron)) {
    const [min, hour] = cron.split(' ');
    return `Diariamente às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  if (/^\d+ \d+ \* \* [\d,]+$/.test(cron)) {
    const [min, hour, , , days] = cron.split(' ');
    return `Semanal (${days}) às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  return 'Customizado';
}

function parseMode(cron: string): FrequencyMode {
  if (/^\*\/\d+ \* \* \* \*$/.test(cron)) return 'minutes';
  if (/^0 \*\/\d+ \* \* \*$/.test(cron)) return 'hours';
  if (/^\d+ \d+ \* \* \*$/.test(cron)) return 'daily';
  if (/^\d+ \d+ \* \* [\d,]+$/.test(cron)) return 'weekly';
  return 'custom';
}

export function CronBuilder({ value, onChange }: Props) {
  const [mode, setMode] = useState<FrequencyMode>('custom');
  const [everyMinutes, setEveryMinutes] = useState(15);
  const [everyHours, setEveryHours] = useState(1);
  const [dailyTime, setDailyTime] = useState('08:00');
  const [weeklyTime, setWeeklyTime] = useState('08:00');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1]);

  useEffect(() => {
    setMode(parseMode(value));
  }, [value]);

  const nextRuns = useMemo(() => {
    try {
      const interval = parser.parseExpression(value, { currentDate: new Date() });
      return Array.from({ length: 5 }).map(() => interval.next().toDate());
    } catch {
      return [];
    }
  }, [value]);

  function applyCurrent(modeToApply: FrequencyMode) {
    if (modeToApply === 'minutes') {
      onChange(`*/${everyMinutes} * * * *`);
      return;
    }

    if (modeToApply === 'hours') {
      if (everyHours === 24) {
        onChange('0 0 * * *');
      } else {
        onChange(`0 */${everyHours} * * *`);
      }
      return;
    }

    if (modeToApply === 'daily') {
      const [hh, mm] = dailyTime.split(':').map(Number);
      onChange(`${mm} ${hh} * * *`);
      return;
    }

    if (modeToApply === 'weekly') {
      const [hh, mm] = weeklyTime.split(':').map(Number);
      onChange(`${mm} ${hh} * * ${weeklyDays.sort((a, b) => a - b).join(',')}`);
      return;
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-[#0f1520] p-3">
      <label className="block text-xs text-slate-300">
        Frequência
        <select
          className="editor-input mt-1"
          value={mode}
          onChange={(e) => {
            const newMode = e.target.value as FrequencyMode;
            setMode(newMode);
            if (newMode !== 'custom') applyCurrent(newMode);
          }}
        >
          <option value="minutes">A cada X minutos</option>
          <option value="hours">A cada X horas</option>
          <option value="daily">Diário às HH:MM</option>
          <option value="weekly">Semanal</option>
          <option value="custom">Customizado</option>
        </select>
      </label>

      {mode === 'minutes' && (
        <div className="flex flex-wrap gap-2">
          {minutePresets.map((min) => (
            <button
              key={min}
              type="button"
              className={`btn-mini ${everyMinutes === min ? 'ring-1 ring-[var(--teal)]' : ''}`}
              onClick={() => {
                setEveryMinutes(min);
                onChange(`*/${min} * * * *`);
              }}
            >
              {min} min
            </button>
          ))}
        </div>
      )}

      {mode === 'hours' && (
        <div className="flex flex-wrap gap-2">
          {hourPresets.map((hour) => (
            <button
              key={hour}
              type="button"
              className={`btn-mini ${everyHours === hour ? 'ring-1 ring-[var(--teal)]' : ''}`}
              onClick={() => {
                setEveryHours(hour);
                onChange(hour === 24 ? '0 0 * * *' : `0 */${hour} * * *`);
              }}
            >
              {hour}h
            </button>
          ))}
        </div>
      )}

      {mode === 'daily' && (
        <div className="flex items-center gap-2">
          <input type="time" value={dailyTime} className="editor-input" onChange={(e) => setDailyTime(e.target.value)} />
          <button className="btn-editor" type="button" onClick={() => applyCurrent('daily')}>Aplicar</button>
        </div>
      )}

      {mode === 'weekly' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {weekdays.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`rounded px-2 py-1 text-xs ${weeklyDays.includes(day.value) ? 'bg-[var(--teal)]/20 text-[var(--teal)]' : 'bg-white/5'}`}
                onClick={() =>
                  setWeeklyDays((prev) =>
                    prev.includes(day.value) ? prev.filter((d) => d !== day.value) : [...prev, day.value]
                  )
                }
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="time" value={weeklyTime} className="editor-input" onChange={(e) => setWeeklyTime(e.target.value)} />
            <button className="btn-editor" type="button" onClick={() => applyCurrent('weekly')}>Aplicar</button>
          </div>
        </div>
      )}

      <label className="block text-xs text-slate-300">
        Expressão Cron (raw)
        <input className="editor-input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>

      <p className="text-xs text-slate-400">Descrição: {cronToPortuguese(value)}</p>

      <div>
        <p className="mb-1 text-xs text-slate-400">Próximas 5 execuções:</p>
        <ul className="space-y-1 text-xs text-slate-300">
          {nextRuns.map((run, idx) => (
            <li key={idx} className="rounded bg-white/5 px-2 py-1">{run.toLocaleString()}</li>
          ))}
          {!nextRuns.length && <li className="text-[var(--red)]">Cron inválido</li>}
        </ul>
      </div>
    </div>
  );
}
