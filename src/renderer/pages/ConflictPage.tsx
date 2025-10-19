import { useNavigate } from 'react-router-dom';

interface ConflictPageProps {
  onNext: () => void;
}

export default function ConflictPage({ onNext }: ConflictPageProps) {
  const navigate = useNavigate();

  const handleNext = () => {
    onNext();
    navigate('/report');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Conflict Resolution</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">Conflict resolution page content will go here.</p>
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
