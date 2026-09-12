const STYLES = {
  ROUTINE: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export default function UrgencyBadge({ level }) {
  if (!level) return <span className="text-gray-400 text-sm">No report yet</span>;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STYLES[level] || 'bg-gray-100 text-gray-800'}`}>
      {level}
    </span>
  );
}
