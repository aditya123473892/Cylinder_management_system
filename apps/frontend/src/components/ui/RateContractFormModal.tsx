'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, Users, Package, DollarSign, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest } from '../../types/rateContract';
import { rateContractApi } from '../../lib/api/rateContractApi';
import { cylinderTypeApi } from '../../lib/api/cylinderTypeApi';
import { CylinderTypeMaster } from '../../types/cylinderType';
import toast from 'react-hot-toast';

interface RateContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateContract?: RateContractMaster | null;
  onSuccess: () => void;
}

export function RateContractFormModal({ isOpen, onClose, rateContract, onSuccess }: RateContractFormModalProps) {
  const [formData, setFormData] = useState({
    contract_name: '',
    customer_type: 'DIRECT' as 'DIRECT' | 'SUB_DEALER' | 'ALL',
    cylinder_type_id: '',
    rate_per_cylinder: '',
    valid_from: '',
    valid_to: '',
  });
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!rateContract;

  useEffect(() => {
    fetchCylinderTypes();
  }, []);

  useEffect(() => {
    if (rateContract) {
      setFormData({
        contract_name: rateContract.contract_name,
        customer_type: rateContract.customer_type,
        cylinder_type_id: rateContract.cylinder_type_id.toString(),
        rate_per_cylinder: rateContract.rate_per_cylinder.toString(),
        valid_from: rateContract.valid_from.split('T')[0],
        valid_to: rateContract.valid_to.split('T')[0],
      });
    } else {
      setFormData({
        contract_name: '',
        customer_type: 'DIRECT',
        cylinder_type_id: '',
        rate_per_cylinder: '',
        valid_from: '',
        valid_to: '',
      });
    }
  }, [rateContract, isOpen]);

  const fetchCylinderTypes = async () => {
    try {
      const data = await cylinderTypeApi.getAllCylinderTypes();
      setCylinderTypes(data);
    } catch (error) {
      console.error('Error fetching cylinder types:', error);
      toast.error('Failed to load cylinder types');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ratePerCylinder = parseFloat(formData.rate_per_cylinder);

      if (isNaN(ratePerCylinder) || ratePerCylinder <= 0) {
        toast.error('Rate per cylinder must be a positive number');
        return;
      }

      // Validate date range
      const validFrom = new Date(formData.valid_from);
      const validTo = new Date(formData.valid_to);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (validFrom >= validTo) {
        toast.error('Valid to date must be after valid from date');
        return;
      }

      if (validTo < today) {
        toast.error('Valid to date cannot be in the past');
        return;
      }

      const requestData = {
        contract_name: formData.contract_name.trim(),
        customer_type: formData.customer_type,
        cylinder_type_id: parseInt(formData.cylinder_type_id),
        rate_per_cylinder: ratePerCylinder,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
      };

      if (isEditing && rateContract) {
        await rateContractApi.updateRateContract(rateContract.rate_contract_id, requestData);
        toast.success('Rate contract updated successfully!');
      } else {
        await rateContractApi.createRateContract(requestData as CreateRateContractRequest);
        toast.success('Rate contract created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving rate contract:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save rate contract');
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

  const getCylinderTypeName = (cylinderTypeId: number) => {
    const cylinderType = cylinderTypes.find(ct => ct.CylinderTypeId === cylinderTypeId);
    return cylinderType ? cylinderType.Capacity : 'Unknown';
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
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Edit Rate Contract' : 'Add New Rate Contract'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isEditing ? 'Update contract details' : 'Create a new pricing contract'}
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
              {/* Contract Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Contract Name *</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.contract_name}
                  onChange={(e) => handleInputChange('contract_name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Standard Direct Customer Rate"
                  required
                  maxLength={100}
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Customer Type *</span>
                  </div>
                </label>
                <select
                  value={formData.customer_type}
                  onChange={(e) => handleInputChange('customer_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="DIRECT">Direct Customer</option>
                  <option value="SUB_DEALER">Sub-dealer</option>
                  <option value="ALL">All Customers</option>
                </select>
              </div>

              {/* Cylinder Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span>Cylinder Type *</span>
                  </div>
                </label>
                <select
                  value={formData.cylinder_type_id}
                  onChange={(e) => handleInputChange('cylinder_type_id', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select cylinder type</option>
                  {cylinderTypes.map((type) => (
                    <option key={type.CylinderTypeId} value={type.CylinderTypeId}>
                      {type.Capacity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate per Cylinder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>Rate per Cylinder (₹) *</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.rate_per_cylinder}
                  onChange={(e) => handleInputChange('rate_per_cylinder', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 150.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              {/* Valid From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Valid From *</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => handleInputChange('valid_from', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Valid To Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Valid To *</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => handleInputChange('valid_to', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min={formData.valid_from || undefined}
                />
                {formData.valid_from && formData.valid_to && (
                  <div className="mt-2 flex items-center space-x-2">
                    {new Date(formData.valid_to) < new Date() ? (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Contract has expired</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Valid contract period</span>
                      </>
                    )}
                  </div>
                )}
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
                  <span>{isLoading ? 'Saving...' : (isEditing ? 'Update Contract' : 'Create Contract')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
