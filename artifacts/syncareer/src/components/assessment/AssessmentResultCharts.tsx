import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SECTION_COLORS } from '@/pages/assessment/assessmentConstants';

/**
 * Result charts for the assessment report.
 *
 * Kept in their own module so the page can lazy-load them: recharts (with
 * lodash/d3) is only needed once a completed result is shown, not while a
 * visitor is answering questions or while the public landing prefetches the
 * assessment route chunk.
 */

export function RiasecBarChart({ data }: { data: Array<{ name: string; score: number }> }) {
  return (
    <div aria-hidden="true" className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Score']}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SECTION_COLORS[entry.name] || 'hsl(var(--primary))'} opacity={index < 3 ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PersonalityRadarChart({ data }: { data: Array<{ axis: string; value: number }> }) {
  return (
    <div aria-hidden="true" className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Radar name="Personality" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillsBarChart({ data }: { data: Array<{ axis: string; value: number }> }) {
  return (
    <div aria-hidden="true" className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis type="category" dataKey="axis" width={90} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Score']}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--accent))" fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
