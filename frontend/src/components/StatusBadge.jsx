const STYLES = {
  OVERDUE: 'bg-red-100 text-red-700 border border-red-300',
  DUE_SOON: 'bg-amber-100 text-amber-700 border border-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-700 border border-blue-300',
  DONE: 'bg-green-100 text-green-700 border border-green-300',
};

const LABELS = {
  OVERDUE: 'Depasita',
  DUE_SOON: 'Scadenta apropiata',
  UPCOMING: 'Programata',
  DONE: 'Finalizata',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[status] || status}
    </span>
  );
}
