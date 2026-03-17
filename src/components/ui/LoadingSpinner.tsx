export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-sage border-t-forest rounded-full animate-spin" />
    </div>
  );
}
