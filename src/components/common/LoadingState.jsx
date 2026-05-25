export default function LoadingState({ label = 'Veriler yükleniyor' }) {
  return (
    <div className="glass-panel grid min-h-48 place-items-center p-6 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-dexa-cyan/20 border-t-dexa-cyan" />
        <p className="mt-4 text-sm font-semibold text-dexa-muted">{label}</p>
      </div>
    </div>
  );
}
