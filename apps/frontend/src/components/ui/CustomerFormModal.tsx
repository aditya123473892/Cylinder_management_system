'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Upload } from 'lucide-react';
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
    ParentDealerId: null,
    Location: '',
    IsActive: true,
    CreatedBy: null,
    AadhaarImage: null,
    PanImage: null,
    GSTNumber: null,
    StateCode: null,
    BillingAddress: null,
  });

  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCustomerRequest, string>>>({});

  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!customer;

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      loadDealers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (customer) {
      console.log('Customer data received:', customer);
      console.log('AadhaarImage raw:', customer.AadhaarImage);
      console.log('PanImage raw:', customer.PanImage);

      setFormData({
        CustomerName: customer.CustomerName,
        ParentDealerId: customer.ParentDealerId,
        Location: customer.Location,
        IsActive: customer.IsActive,
        CreatedBy: customer.CreatedBy,
        AadhaarImage: customer.AadhaarImage,
        PanImage: customer.PanImage,
        GSTNumber: customer.GSTNumber,
        StateCode: customer.StateCode,
        BillingAddress: customer.BillingAddress,
      });

      // Format base64 strings as data URLs for image preview
      // Try different MIME types if the image doesn't load
      const createDataUrl = (base64String: string) => {
        if (!base64String) return null;

        // Clean the base64 string (remove any data URL prefix if present)
        const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

        // Try common image formats
        const formats = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
        for (const format of formats) {
          try {
            const dataUrl = `data:image/${format};base64,${cleanBase64}`;
            console.log(`Trying ${format} format:`, dataUrl.substring(0, 50) + '...');
            return dataUrl;
          } catch (e) {
            console.warn(`Failed to create ${format} data URL:`, e);
          }
        }

        // Fallback to jpeg
        return `data:image/jpeg;base64,${cleanBase64}`;
      };

      const aadhaarDataUrl = customer.AadhaarImage ? createDataUrl(customer.AadhaarImage) : null;
      const panDataUrl = customer.PanImage ? createDataUrl(customer.PanImage) : null;

      console.log('Aadhaar data URL created:', aadhaarDataUrl ? 'Yes' : 'No');
      console.log('PAN data URL created:', panDataUrl ? 'Yes' : 'No');

      setAadhaarPreview(aadhaarDataUrl);
      setPanPreview(panDataUrl);
    } else {
      setFormData({
        CustomerName: '',
        ParentDealerId: null,
        Location: '',
        IsActive: true,
        CreatedBy: null,
        AadhaarImage: null,
        PanImage: null,
        GSTNumber: null,
        StateCode: null,
        BillingAddress: null,
      });
      setAadhaarPreview(null);
      setPanPreview(null);
      setAadhaarFile(null);
      setPanFile(null);
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

  const loadDealers = async () => {
    try {
      const { dealerApi } = await import('../../lib/api/dealerApi');
      const data = await dealerApi.getAllDealers();
      setDealers(data);
    } catch (error) {
      console.error('Error loading dealers:', error);
      toast.error('Failed to load dealers');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCustomerRequest, string>> = {};

    if (!formData.CustomerName.trim()) {
      newErrors.CustomerName = 'Customer name is required';
    } else if (formData.CustomerName.length > 200) {
      newErrors.CustomerName = 'Customer name cannot exceed 200 characters';
    }

    if (!formData.Location.trim()) {
      newErrors.Location = 'Location is required';
    } else if (formData.Location.length > 200) {
      newErrors.Location = 'Location cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'aadhaar' | 'pan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (field === 'aadhaar') {
        setAadhaarFile(file);
        setAadhaarPreview(base64);
        setFormData(prev => ({ ...prev, AadhaarImage: base64 }));
      } else {
        setPanFile(file);
        setPanPreview(base64);
        setFormData(prev => ({ ...prev, PanImage: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (field: 'aadhaar' | 'pan') => {
    if (field === 'aadhaar') {
      setAadhaarFile(null);
      setAadhaarPreview(null);
      setFormData(prev => ({ ...prev, AadhaarImage: null }));
      if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
    } else {
      setPanFile(null);
      setPanPreview(null);
      setFormData(prev => ({ ...prev, PanImage: null }));
      if (panInputRef.current) panInputRef.current.value = '';
    }
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
            ParentDealerId: formData.ParentDealerId || null,
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
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
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

                {/* Parent Dealer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Dealer
                  </label>
                  <select
                    value={formData.ParentDealerId || ''}
                    onChange={(e) => handleInputChange('ParentDealerId', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent dealer</option>
                    {dealers.map(dealer => (
                      <option key={dealer.DealerId} value={dealer.DealerId}>
                        {dealer.DealerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.Location}
                    onChange={(e) => handleInputChange('Location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.Location ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter location"
                    maxLength={200}
                  />
                  {errors.Location && (
                    <p className="mt-1 text-sm text-red-600">{errors.Location}</p>
                  )}
                </div>

                {/* GST Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.GSTNumber || ''}
                    onChange={(e) => handleInputChange('GSTNumber', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter GST number (15 digits)"
                    maxLength={15}
                  />
                </div>

                {/* State Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State Code
                  </label>
                  <input
                    type="text"
                    value={formData.StateCode || ''}
                    onChange={(e) => handleInputChange('StateCode', e.target.value.toUpperCase() || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter state code (2 letters)"
                    maxLength={2}
                  />
                </div>

                {/* Billing Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Address
                  </label>
                  <textarea
                    value={formData.BillingAddress || ''}
                    onChange={(e) => handleInputChange('BillingAddress', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter billing address"
                    rows={3}
                    maxLength={500}
                  />
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
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aadhaar Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Image
                  </label>
                  <div className="space-y-2">
                    <input
                      ref={aadhaarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'aadhaar')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => aadhaarInputRef.current?.click()}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Aadhaar Image
                    </button>
                    {aadhaarPreview && (
                      <div className="relative">
                        <img
                          src={aadhaarPreview}
                          alt="Aadhaar Preview"
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage('aadhaar')}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAN Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Image
                  </label>
                  <div className="space-y-2">
                    <input
                      ref={panInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'pan')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => panInputRef.current?.click()}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose PAN Image
                    </button>
                    {panPreview && (
                      <div className="relative">
                        <img
                          src={panPreview}
                          alt="PAN Preview"
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage('pan')}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
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
