import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import apiClient from '../../api/client';

interface GenerateBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onBioGenerated: (bio: string) => void;
}

export const GenerateBioModal: React.FC<GenerateBioModalProps> = ({
  isOpen,
  onClose,
  memberId,
  onBioGenerated
}) => {
  const [bulletPoints, setBulletPoints] = useState<string[]>(['']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddPoint = () => setBulletPoints([...bulletPoints, '']);

  const handleRemovePoint = (index: number) => {
    if (bulletPoints.length > 1) {
      setBulletPoints(bulletPoints.filter((_, i) => i !== index));
    }
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...bulletPoints];
    newPoints[index] = value;
    setBulletPoints(newPoints);
  };

  const handleGenerate = async () => {
    const validPoints = bulletPoints.filter(p => p.trim() !== '');
    if (validPoints.length === 0) {
      setError('Please add at least one fact about the member.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiClient.post('/ai/generate-bio', { memberId, bulletPoints: validPoints });
      onBioGenerated(res.data.bio);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate biography. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-bio-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center text-purple-700">
            <Sparkles size={20} className="mr-2" aria-hidden="true" />
            <h2 id="generate-bio-title" className="text-xl font-bold">AI Family Historian</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI Family Historian dialog"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Provide a few key facts, milestones, or stories about this person. Our AI Historian will weave them into a beautiful, culturally-aware biography.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {bulletPoints.map((point, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
                  {index + 1}
                </div>
                <label htmlFor={`fact-${index}`} className="sr-only">Fact {index + 1}</label>
                <input
                  id={`fact-${index}`}
                  type="text"
                  value={point}
                  onChange={(e) => handlePointChange(index, e.target.value)}
                  placeholder="e.g., Moved to Mumbai in 1980"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleRemovePoint(index)}
                  disabled={bulletPoints.length === 1}
                  aria-label={`Remove fact ${index + 1}`}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddPoint}
            aria-label="Add another fact"
            className="mt-3 flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            <Plus size={16} className="mr-1" aria-hidden="true" />
            Add another fact
          </button>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Biography'}
          </Button>
        </div>
      </div>
    </div>
  );
};
