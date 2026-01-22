'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { LocationMaster, CreateLocationRequest, UpdateLocationRequest } from '../../types/location';
import toast from 'react-hot-toast';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
  location?: LocationMaster | null;
  isLoading?: boolean;
}

export function LocationFormModal({
  isOpen,
  onClose,
  onSubmit,
  location,
  isLoading = false
}: LocationFormModalProps) {
  const [formData, setFormData] = useState<CreateLocationRequest>({
    LocationName: '',
    LocationType: '',
    Address: '',
    Image: '',
    Latitude: undefined,
    Longitude: undefined,
    IsActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const isEditing = !!location;

  useEffect(() => {
    if (location) {
      setFormData({
        LocationName: location.LocationName,
        LocationType: location.LocationType,
        Address: location.Address || '',
        Image: location.Image || '',
        Latitude: location.Latitude || undefined,
        Longitude: location.Longitude || undefined,
        IsActive: location.IsActive,
      });
    } else {
      setFormData({
        LocationName: '',
        LocationType: '',
        Address: '',
        Image: '',
        Latitude: undefined,
        Longitude: undefined,
        IsActive: true,
      });
    }
    setErrors({});
  }, [location, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateLocationRequest, string>> = {};

    if (!formData.LocationName.trim()) {
      newErrors.LocationName = 'Location name is required';
    } else if (formData.LocationName.length > 100) {
      newErrors.LocationName = 'Location name cannot exceed 100 characters';
    }

    if (!formData.LocationType.trim()) {
      newErrors.LocationType = 'Location type is required';
    } else if (formData.LocationType.length > 30) {
      newErrors.LocationType = 'Location type cannot exceed 30 characters';
    }

    if (formData.Address && formData.Address.length > 500) {
      newErrors.Address = 'Address cannot exceed 500 characters';
    }

    if (formData.Image && formData.Image.length > 255) {
      newErrors.Image = 'Image path cannot exceed 255 characters';
    }

    if (formData.Latitude !== undefined && (formData.Latitude < -90 || formData.Latitude > 90)) {
      newErrors.Latitude = 'Latitude must be between -90 and 90';
    }

    if (formData.Longitude !== undefined && (formData.Longitude < -180 || formData.Longitude > 180)) {
      newErrors.Longitude = 'Longitude must be between -180 and 180';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
            Address: formData.Address || null,
            Image: formData.Image || null,
            Latitude: formData.Latitude || null,
            Longitude: formData.Longitude || null,
          } as UpdateLocationRequest
        : formData;

      await onSubmit(submitData);
      toast.success(`Location ${isEditing ? 'updated' : 'created'} successfully`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    }
  };

  const handleInputChange = (field: keyof CreateLocationRequest, value: any) => {
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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Location' : 'Add Location'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={formData.LocationName}
                      onChange={(e) => handleInputChange('LocationName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.LocationName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter location name"
                      maxLength={100}
                    />
                    {errors.LocationName && (
                      <p className="mt-1 text-sm text-red-600">{errors.LocationName}</p>
                    )}
                  </div>

                  {/* Location Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Type *
                    </label>
                    <select
                      value={formData.LocationType}
                      onChange={(e) => handleInputChange('LocationType', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.LocationType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select type</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Store">Store</option>
                      <option value="Office">Office</option>
                      <option value="Factory">Factory</option>
                      <option value="Distribution Center">Distribution Center</option>
                      <option value="Depot">Depot</option>
                      <option value="Branch">Branch</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.LocationType && (
                      <p className="mt-1 text-sm text-red-600">{errors.LocationType}</p>
                    )}
                  </div>

                  {/* Latitude */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="-90"
                      max="90"
                      value={formData.Latitude || ''}
                      onChange={(e) => handleInputChange('Latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.Latitude ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter latitude (-90 to 90)"
                    />
                    {errors.Latitude && (
                      <p className="mt-1 text-sm text-red-600">{errors.Latitude}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.Address}
                      onChange={(e) => handleInputChange('Address', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.Address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter complete address"
                      rows={3}
                      maxLength={500}
                    />
                    {errors.Address && (
                      <p className="mt-1 text-sm text-red-600">{errors.Address}</p>
                    )}
                  </div>

                  {/* Longitude */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="-180"
                      max="180"
                      value={formData.Longitude || ''}
                      onChange={(e) => handleInputChange('Longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.Longitude ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter longitude (-180 to 180)"
                    />
                    {errors.Longitude && (
                      <p className="mt-1 text-sm text-red-600">{errors.Longitude}</p>
                    )}
                  </div>

                  {/* Image */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Image
                    </label>
                    <input
                      type="text"
                      value={formData.Image}
                      onChange={(e) => handleInputChange('Image', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.Image ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter image URL or path (optional)"
                      maxLength={255}
                    />
                    {errors.Image && (
                      <p className="mt-1 text-sm text-red-600">{errors.Image}</p>
                    )}
                  </div>

                  {/* IsActive */}
                  <div className="md:col-span-2 flex items-center">
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
