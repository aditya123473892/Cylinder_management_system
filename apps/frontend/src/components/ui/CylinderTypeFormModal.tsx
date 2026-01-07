'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { CylinderTypeMaster, CreateCylinderTypeRequest, UpdateCylinderTypeRequest } from '../../types/cylinderType';
import toast from 'react-hot-toast';

interface CylinderTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCylinderTypeRequest | UpdateCylinderTypeRequest) => Promise<void>;
  cylinderType?: CylinderTypeMaster | null;
  isLoading?: boolean;
}

export function CylinderTypeFormModal({
  isOpen,
  onClose,
  onSubmit,
  cylinderType,
  isLoading = false
}: CylinderTypeFormModalProps) {
  const [formData, setFormData] = useState<CreateCylinderTypeRequest>({
    Capacity: '',
    IsActive: true,
    HeightCM: undefined,
    ManufacturingDate: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateCylinderTypeRequest, string>>>({});

  const isEditing = !!cylinderType;

  useEffect(() => {
    if (cylinderType) {
      setFormData({
        Capacity: cylinderType.Capacity,
        IsActive: cylinderType.IsActive,
        HeightCM: cylinderType.HeightCM || undefined,
        ManufacturingDate: cylinderType.ManufacturingDate || undefined,
      });
    } else {
      setFormData({
        Capacity: '',
        IsActive: true,
        HeightCM: undefined,
        ManufacturingDate: undefined,
      });
    }
    setErrors({});
  }, [cylinderType, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCylinderTypeRequest, string>> = {};

    if (!formData.Capacity.trim()) {
      newErrors.Capacity = 'Capacity is required';
    } else if (formData.Capacity.length > 20) {
      newErrors.Capacity = 'Capacity cannot exceed 20 characters';
    }

    if (formData.HeightCM !== undefined && (formData.HeightCM <= 0 || formData.HeightCM > 999.99)) {
      newErrors.HeightCM = 'Height must be a positive number less than 1000';
    }

    if (formData.ManufacturingDate && !isValidDate(formData.ManufacturingDate)) {
      newErrors.ManufacturingDate = 'Invalid date format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = isEditing
        ? {
            ...formData,
            HeightCM: formData.HeightCM || null,
            ManufacturingDate: formData.ManufacturingDate || null,
          } as UpdateCylinderTypeRequest
        : formData;

      await onSubmit(submitData);
      toast.success(`Cylinder type ${isEditing ? 'updated' : 'created'} successfully`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    }
  };

  const handleInputChange = (field: keyof CreateCylinderTypeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Cylinder Type' : 'Add Cylinder Type'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="text"
                    value={formData.Capacity}
                    onChange={(e) => handleInputChange('Capacity', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.Capacity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter capacity"
                    maxLength={20}
                  />
                  {errors.Capacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.Capacity}</p>
                  )}
                </div>

                {/* IsActive */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.IsActive}
                    onChange={(e) => handleInputChange('IsActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                {/* HeightCM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (CM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999.99"
                    value={formData.HeightCM || ''}
                    onChange={(e) => handleInputChange('HeightCM', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.HeightCM ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter height in cm"
                  />
                  {errors.HeightCM && (
                    <p className="mt-1 text-sm text-red-600">{errors.HeightCM}</p>
                  )}
                </div>

                {/* ManufacturingDate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturing Date
                  </label>
                  <input
                    type="date"
                    value={formData.ManufacturingDate || ''}
                    onChange={(e) => handleInputChange('ManufacturingDate', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.ManufacturingDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.ManufacturingDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.ManufacturingDate}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}