'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { CustomerMaster, CreateCustomerRequest, UpdateCustomerRequest } from '../../types/customer';
import { LocationMaster } from '../../types/location';
import { locationApi } from '../../lib/api/locationApi';
import { customerApi } from '../../lib/api/customerApi';
import toast from 'react-hot-toast';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerRequest | UpdateCustomerRequest) => Promise<void>;
  customer?: CustomerMaster | null;
  isLoading?: boolean;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  isLoading = false
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    CustomerName: '',
    CustomerType: '',
    ParentCustomerId: null,
    LocationId: 0,
    RetentionDays: 0,
    IsActive: true,
    CreatedBy: null,
  });

  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCustomerRequest, string>>>({});

  const isEditing = !!customer;

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      loadCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (customer) {
      setFormData({
        CustomerName: customer.CustomerName,
        CustomerType: customer.CustomerType,
        ParentCustomerId: customer.ParentCustomerId,
        LocationId: customer.LocationId,
        RetentionDays: customer.RetentionDays,
        IsActive: customer.IsActive,
        CreatedBy: customer.CreatedBy,
      });
    } else {
      setFormData({
        CustomerName: '',
        CustomerType: '',
        ParentCustomerId: null,
        LocationId: 0,
        RetentionDays: 0,
        IsActive: true,
        CreatedBy: null,
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const loadLocations = async () => {
    try {
      const data = await locationApi.getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customerApi.getAllCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCustomerRequest, string>> = {};

    if (!formData.CustomerName.trim()) {
      newErrors.CustomerName = 'Customer name is required';
    } else if (formData.CustomerName.length > 200) {
      newErrors.CustomerName = 'Customer name cannot exceed 200 characters';
    }

    if (!formData.CustomerType.trim()) {
      newErrors.CustomerType = 'Customer type is required';
    } else if (formData.CustomerType.length > 20) {
      newErrors.CustomerType = 'Customer type cannot exceed 20 characters';
    }

    if (!formData.LocationId || formData.LocationId <= 0) {
      newErrors.LocationId = 'Valid location is required';
    }

    if (formData.RetentionDays < 0) {
      newErrors.RetentionDays = 'Retention days must be non-negative';
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
            ParentCustomerId: formData.ParentCustomerId || null,
          } as UpdateCustomerRequest
        : formData;

      await onSubmit(submitData);
      toast.success(`Customer ${isEditing ? 'updated' : 'created'} successfully`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    }
  };

  const handleInputChange = (field: keyof CreateCustomerRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const customerTypes = ['Dealer', 'Customer', 'Sub-Dealer'];

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
                  {isEditing ? 'Edit Customer' : 'Add Customer'}
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
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.CustomerName}
                    onChange={(e) => handleInputChange('CustomerName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.CustomerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter customer name"
                    maxLength={200}
                  />
                  {errors.CustomerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.CustomerName}</p>
                  )}
                </div>

                {/* Customer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={formData.CustomerType}
                    onChange={(e) => handleInputChange('CustomerType', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.CustomerType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select customer type</option>
                    {customerTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.CustomerType && (
                    <p className="mt-1 text-sm text-red-600">{errors.CustomerType}</p>
                  )}
                </div>

                {/* Parent Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Customer
                  </label>
                  <select
                    value={formData.ParentCustomerId || ''}
                    onChange={(e) => handleInputChange('ParentCustomerId', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent customer</option>
                    {customers
                      .filter(c => c.CustomerId !== customer?.CustomerId) // Exclude self
                      .map(c => (
                        <option key={c.CustomerId} value={c.CustomerId}>{c.CustomerName}</option>
                      ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <select
                    value={formData.LocationId || ''}
                    onChange={(e) => handleInputChange('LocationId', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.LocationId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select location</option>
                    {locations.map(location => (
                      <option key={location.LocationId} value={location.LocationId}>
                        {location.LocationName}
                      </option>
                    ))}
                  </select>
                  {errors.LocationId && (
                    <p className="mt-1 text-sm text-red-600">{errors.LocationId}</p>
                  )}
                </div>

                {/* Retention Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention Days *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.RetentionDays}
                    onChange={(e) => handleInputChange('RetentionDays', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.RetentionDays ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter retention days"
                  />
                  {errors.RetentionDays && (
                    <p className="mt-1 text-sm text-red-600">{errors.RetentionDays}</p>
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
