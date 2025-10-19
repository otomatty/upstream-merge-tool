export default function StatusBar({ currentStep }: { currentStep: string }) {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-3">
      <div className="text-sm text-gray-600">
        Current Step: <span className="font-semibold text-gray-900">{currentStep}</span>
      </div>
    </div>
  );
}
