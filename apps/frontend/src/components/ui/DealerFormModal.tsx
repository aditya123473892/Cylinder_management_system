'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Eye, EyeOff } from 'lucide-react';
import { DealerMaster, CreateDealerRequest, UpdateDealerRequest } from '../../types/dealer';
import { LocationMaster } from '../../types/location';
import { locationApi } from '../../lib/api/locationApi';

interface DealerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDealerRequest | UpdateDealerRequest) => Promise<void>;
  dealer?: DealerMaster | null;
  isLoading?: boolean;
}

export function DealerFormModal({
  isOpen,
  onClose,
  onSubmit,
  dealer,
  isLoading = false
}: DealerFormModalProps) {
  const [formData, setFormData] = useState<CreateDealerRequest | UpdateDealerRequest>({
    DealerName: '',
    DealerType: '',
    ParentDealerId: null,
    LocationId: 0,
    IsActive: true,
    AadhaarImage: null,
    PanImage: null,
  });

  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [dealers, setDealers] = useState<DealerMaster[]>([]);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      loadDealers();

      if (dealer) {
        // Edit mode
        console.log('Dealer data received:', dealer);
        console.log('AadhaarImage raw:', dealer.AadhaarImage);
        console.log('PanImage raw:', dealer.PanImage);

        setFormData({
          DealerName: dealer.DealerName,
          DealerType: dealer.DealerType,
          ParentDealerId: dealer.ParentDealerId,
          LocationId: dealer.LocationId,
          IsActive: dealer.IsActive,
          AadhaarImage: dealer.AadhaarImage,
          PanImage: dealer.PanImage,
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

        const aadhaarDataUrl = dealer.AadhaarImage ? createDataUrl(dealer.AadhaarImage) : null;
        const panDataUrl = dealer.PanImage ? createDataUrl(dealer.PanImage) : null;

        console.log('Aadhaar data URL created:', aadhaarDataUrl ? 'Yes' : 'No');
        console.log('PAN data URL created:', panDataUrl ? 'Yes' : 'No');

        setAadhaarPreview(aadhaarDataUrl);
        setPanPreview(panDataUrl);
      } else {
        // Create mode
        setFormData({
          DealerName: '',
          DealerType: '',
          ParentDealerId: null,
          LocationId: 0,
          IsActive: true,
          AadhaarImage: null,
          PanImage: null,
        });
        setAadhaarPreview(null);
        setPanPreview(null);
        setAadhaarFile(null);
        setPanFile(null);
      }
    }
  }, [isOpen, dealer]);

  const loadLocations = async () => {
    try {
      const data = await locationApi.getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadDealers = async () => {
    try {
      // Import dealerApi dynamically to avoid circular dependency
      const { dealerApi } = await import('../../lib/api/dealerApi');
      const data = await dealerApi.getAllDealers();
      setDealers(data);
    } catch (error) {
      console.error('Error loading dealers:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }));
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

    // Validate required fields
    if (!formData.DealerName?.trim()) {
      alert('Dealer name is required');
      return;
    }
    if (!formData.DealerType?.trim()) {
      alert('Dealer type is required');
      return;
    }
    if (!formData.LocationId || formData.LocationId === 0) {
      alert('Location is required');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const availableParentDealers = dealers.filter(d => d.DealerId !== dealer?.DealerId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {dealer ? 'Edit Dealer' : 'Add New Dealer'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dealer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dealer Name *
                  </label>
                  <input
                    type="text"
                    name="DealerName"
                    value={formData.DealerName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter dealer name"
                    required
                  />
                </div>

                {/* Dealer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dealer Type *
                  </label>
                  <select
                    name="DealerType"
                    value={formData.DealerType || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select dealer type</option>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Tertiary">Tertiary</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <select
                    name="LocationId"
                    value={formData.LocationId || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map(location => (
                      <option key={location.LocationId} value={location.LocationId}>
                        {location.LocationName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Parent Dealer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Dealer
                  </label>
                  <select
                    name="ParentDealerId"
                    value={formData.ParentDealerId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        ParentDealerId: value ? parseInt(value) : null,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent dealer</option>
                    {availableParentDealers.map(parentDealer => (
                      <option key={parentDealer.DealerId} value={parentDealer.DealerId}>
                        {parentDealer.DealerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="IsActive"
                    checked={formData.IsActive || false}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
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

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : dealer ? 'Update Dealer' : 'Create Dealer'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
