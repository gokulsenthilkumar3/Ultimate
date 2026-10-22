import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../common/Button';

const memberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthDate: z.string().optional(),
  birthLocation: z.string().optional(),
  isAlive: z.boolean(),
  deathDate: z.string().optional(),
  bio: z.string().optional(),
  relationshipToRoot: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberFormProps {
  onSubmit: (data: MemberFormValues) => void;
  defaultValues?: Partial<MemberFormValues>;
  onCancel?: () => void;
}

export const MemberForm: React.FC<MemberFormProps> = ({ onSubmit, defaultValues, onCancel }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      isAlive: true,
      ...defaultValues
    }
  });

  const isAlive = watch('isAlive');

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input 
          {...register('name')} 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none"
          placeholder="e.g. Ramesh Sharma"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select 
            {...register('gender')} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none bg-white"
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship (to you)</label>
          <select 
            {...register('relationshipToRoot')} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none bg-white"
          >
            <option value="">Select...</option>
            <option value="parent">Parent</option>
            <option value="child">Child</option>
            <option value="spouse">Spouse</option>
            <option value="sibling">Sibling</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
          <input 
            type="date"
            {...register('birthDate')} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Location</label>
          <input 
            {...register('birthLocation')} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none"
            placeholder="e.g. Mumbai, India"
          />
        </div>
      </div>

      <div className="flex items-center mt-2 mb-4">
        <input 
          type="checkbox" 
          id="isAlive" 
          {...register('isAlive')} 
          className="h-4 w-4 text-[var(--color-saffron)] focus:ring-[var(--color-saffron)] border-gray-300 rounded"
        />
        <label htmlFor="isAlive" className="ml-2 block text-sm text-gray-900">
          This person is living
        </label>
      </div>

      {!isAlive && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Death Date</label>
          <input 
            type="date"
            {...register('deathDate')} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
        <textarea 
          {...register('bio')} 
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-saffron)] focus:border-transparent outline-none resize-none"
          placeholder="A brief description..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          Save Member
        </Button>
      </div>
    </form>
  );
};
