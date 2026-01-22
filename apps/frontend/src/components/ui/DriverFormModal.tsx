'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Phone, CreditCard, Calendar, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { DriverMaster, CreateDriverRequest, UpdateDriverRequest } from '../../types/driver';
import { driverApi } from '../../lib/api/driverApi';
import toast from 'react-hot-toast';

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver?: DriverMaster | null;
  onSuccess: () => void;
}

export function DriverFormModal({ isOpen, onClose, driver, onSuccess }: DriverFormModalProps) {
  const [formData, setFormData] = useState({
    driver_name: '',
    mobile_number: '',
    license_number: '',
    license_expiry_date: '',
    AadhaarImage: null as string | null,
    PanImage: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!driver;

  useEffect(() => {
    if (driver) {
      setFormData({
        driver_name: driver.driver_name,
        mobile_number: driver.mobile_number,
        license_number: driver.license_number,
        license_expiry_date: driver.license_expiry_date.split('T')[0], // Extract date part
        AadhaarImage: driver.AadhaarImage,
        PanImage: driver.PanImage,
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
            return dataUrl;
          } catch (e) {
            console.warn(`Failed to create ${format} data URL:`, e);
          }
        }

        // Fallback to jpeg
        return `data:image/jpeg;base64,${cleanBase64}`;
      };

      const aadhaarDataUrl = driver.AadhaarImage ? createDataUrl(driver.AadhaarImage) : null;
      const panDataUrl = driver.PanImage ? createDataUrl(driver.PanImage) : null;

      setAadhaarPreview(aadhaarDataUrl);
      setPanPreview(panDataUrl);
    } else {
      setFormData({
        driver_name: '',
        mobile_number: '',
        license_number: '',
        license_expiry_date: '',
        AadhaarImage: null,
        PanImage: null,
      });
      setAadhaarPreview(null);
      setPanPreview(null);
      setAadhaarFile(null);
      setPanFile(null);
    }
  }, [driver, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate mobile number format
      const mobileRegex = /^[0-9+\-\s()]+$/;
      if (!mobileRegex.test(formData.mobile_number)) {
        toast.error('Please enter a valid mobile number');
        return;
      }

      // Validate license expiry date
      const expiryDate = new Date(formData.license_expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        toast.error('License expiry date cannot be in the past');
        return;
      }

      const requestData = {
        driver_name: formData.driver_name.trim(),
        mobile_number: formData.mobile_number.trim(),
        license_number: formData.license_number.trim(),
        license_expiry_date: formData.license_expiry_date,
        AadhaarImage: aadhaarFile ? formData.AadhaarImage : (isEditing && driver?.AadhaarImage ? driver.AadhaarImage : null),
        PanImage: panFile ? formData.PanImage : (isEditing && driver?.PanImage ? driver.PanImage : null),
        CreatedBy: 1, // TODO: Get from auth context
      };

      if (isEditing && driver) {
        await driverApi.updateDriver(driver.driver_id, requestData);
        toast.success('Driver updated successfully!');
      } else {
        await driverApi.createDriver(requestData as CreateDriverRequest);
        toast.success('Driver created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save driver');
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

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isLicenseExpiringSoon = (expiryDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isLicenseExpired = (expiryDate: string) => {
    return getDaysUntilExpiry(expiryDate) < 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'aadhaar' | 'pan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Extract just the base64 part (remove "data:image/...;base64," prefix)
      const base64 = dataUrl.split(',')[1];

      if (field === 'aadhaar') {
        setAadhaarFile(file);
        setAadhaarPreview(dataUrl); // Keep full data URL for preview
        setFormData(prev => ({ ...prev, AadhaarImage: base64 })); // Store just base64 for backend
      } else {
        setPanFile(file);
        setPanPreview(dataUrl); // Keep full data URL for preview
        setFormData(prev => ({ ...prev, PanImage: base64 })); // Store just base64 for backend
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
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Edit Driver' : 'Add New Driver'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isEditing ? 'Update driver information' : 'Create a new driver record'}
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
              {/* Driver Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Driver Name *</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => handleInputChange('driver_name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., John Doe"
                  required
                  maxLength={100}
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>Mobile Number *</span>
                  </div>
                </label>
                <input
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., +91 9876543210"
                  required
                  maxLength={15}
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span>License Number *</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., MH1420150001234"
                  required
                  maxLength={50}
                />
              </div>

              {/* License Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>License Expiry Date *</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={formData.license_expiry_date}
                  onChange={(e) => handleInputChange('license_expiry_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                />
                {formData.license_expiry_date && (
                  <div className="mt-2 flex items-center space-x-2">
                    {isLicenseExpired(formData.license_expiry_date) ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">License has expired</span>
                      </>
                    ) : isLicenseExpiringSoon(formData.license_expiry_date) ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-orange-600">
                          Expires in {getDaysUntilExpiry(formData.license_expiry_date)} days
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Valid license</span>
                      </>
                    )}
                  </div>
                )}
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
                  <span>{isLoading ? 'Saving...' : (isEditing ? 'Update Driver' : 'Create Driver')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
