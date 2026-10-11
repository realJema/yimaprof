import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function SeriesMultiSelect({ options, value, onChange }: { options: { id: string; label: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  return <div className="mt-2 grid gap-2 sm:grid-cols-2">{options.map((option) => <Label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-3 text-sm font-normal"><Checkbox checked={value.includes(option.id)} onCheckedChange={(checked) => onChange(checked ? [...value, option.id] : value.filter((id) => id !== option.id))} />{option.label}</Label>)}</div>;
}