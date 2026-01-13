'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Truck, Hash, Settings, User } from 'lucide-react';
import { VehicleMaster, CreateVehicleRequest, UpdateVehicleRequest } from '../../types/vehicle';
import { vehicleApi } from '../../lib/api/vehicleApi';
import toast from 'react-hot-toast';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: VehicleMaster | null;
  onSuccess: () => void;
}

export function VehicleFormModal({ isOpen, onClose, vehicle, onSuccess }: VehicleFormModalProps) {
  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: '',
    max_cylinder_capacity: '',
    transporter_id: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!vehicle;

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicle_number: vehicle.vehicle_number,
        vehicle_type: vehicle.vehicle_type,
        max_cylinder_capacity: vehicle.max_cylinder_capacity.toString(),
        transporter_id: vehicle.transporter_id?.toString() || '',
      });
    } else {
      setFormData({
        vehicle_number: '',
        vehicle_type: '',
        max_cylinder_capacity: '',
        transporter_id: '',
      });
    }
  }, [vehicle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const maxCapacity = parseInt(formData.max_cylinder_capacity);
      const transporterId = formData.transporter_id ? parseInt(formData.transporter_id) : null;

      if (isNaN(maxCapacity) || maxCapacity <= 0) {
        toast.error('Max cylinder capacity must be a positive number');
        return;
      }

      if (transporterId !== null && isNaN(transporterId)) {
        toast.error('Transporter ID must be a valid number');
        return;
      }

      const requestData = {
        vehicle_number: formData.vehicle_number.trim(),
        vehicle_type: formData.vehicle_type.trim(),
        max_cylinder_capacity: maxCapacity,
        transporter_id: transporterId,
      };

      if (isEditing && vehicle) {
        await vehicleApi.updateVehicle(vehicle.vehicle_id, requestData);
        toast.success('Vehicle updated successfully!');
      } else {
        await vehicleApi.createVehicle(requestData as CreateVehicleRequest);
        toast.success('Vehicle created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isEditing ? 'Update vehicle information' : 'Create a new vehicle record'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span>Vehicle Number *</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., MH12AB1234"
                  required
                  maxLength={20}
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span>Vehicle Type *</span>
                  </div>
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select vehicle type</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Bus">Bus</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Max Cylinder Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <span>Max Cylinder Capacity *</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.max_cylinder_capacity}
                  onChange={(e) => handleInputChange('max_cylinder_capacity', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 100"
                  min="1"
                  required
                />
              </div>

              {/* Transporter ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Transporter ID (Optional)</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.transporter_id}
                  onChange={(e) => handleInputChange('transporter_id', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 1"
                  min="1"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : (isEditing ? 'Update Vehicle' : 'Create Vehicle')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
