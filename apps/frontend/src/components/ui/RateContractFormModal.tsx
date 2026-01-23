'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, Users, Package, DollarSign, Calendar, CheckCircle, AlertTriangle, User, Building } from 'lucide-react';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest, RateContractDetail } from '../../types/rateContract';
import { rateContractApi } from '../../lib/api/rateContractApi';
import { cylinderTypeApi } from '../../lib/api/cylinderTypeApi';
import { customerApi } from '../../lib/api/customerApi';
import { dealerApi } from '../../lib/api/dealerApi';
import { CylinderTypeMaster } from '../../types/cylinderType';
import { CustomerMaster } from '../../types/customer';
import { DealerMaster } from '../../types/dealer';
import toast from 'react-hot-toast';

interface RateContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateContract?: RateContractMaster | null;
  selectedCompany?: { id: number; name: string; type: 'customer' | 'dealer' } | null;
  onSuccess: () => void;
}

export function RateContractFormModal({ isOpen, onClose, rateContract, selectedCompany, onSuccess }: RateContractFormModalProps) {
  const [formData, setFormData] = useState({
    contract_name: '',
    entity_type: 'customer' as 'customer' | 'dealer',
    entity_id: '',
    valid_from: '',
    valid_to: '',
  });

  const [rates, setRates] = useState<RateContractDetail[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [dealers, setDealers] = useState<DealerMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!rateContract;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (rateContract) {
      const entityType = rateContract.customer_id ? 'customer' : 'dealer';
      setFormData({
        contract_name: rateContract.contract_name,
        entity_type: entityType,
        entity_id: (rateContract.customer_id || rateContract.dealer_id || '').toString(),
        valid_from: rateContract.valid_from.split('T')[0],
        valid_to: rateContract.valid_to.split('T')[0],
      });
      setRates([...rateContract.rates]);
    } else if (selectedCompany) {
      // Pre-fill form when creating contract for a specific company
      setFormData({
        contract_name: `${selectedCompany.name} Contract`,
        entity_type: selectedCompany.type,
        entity_id: selectedCompany.id.toString(),
        valid_from: '',
        valid_to: '',
      });
      setRates([]);
    } else {
      setFormData({
        contract_name: '',
        entity_type: 'customer',
        entity_id: '',
        valid_from: '',
        valid_to: '',
      });
      setRates([]);
    }
  }, [rateContract, selectedCompany, isOpen]);

  const fetchData = async () => {
    try {
      const [cylinderData, customerData, dealerData] = await Promise.all([
        cylinderTypeApi.getAllCylinderTypes(),
        customerApi.getAllCustomers(),
        dealerApi.getAllDealers()
      ]);
      setCylinderTypes(cylinderData);
      setCustomers(customerData);
      setDealers(dealerData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load required data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.contract_name.trim()) {
        toast.error('Contract name is required');
        return;
      }

      if (!formData.entity_id) {
        toast.error('Please select a customer or dealer');
        return;
      }

      // Validate rates
      if (rates.length === 0) {
        toast.error('At least one rate must be specified');
        return;
      }

      for (const rate of rates) {
        if (!rate.rate_per_cylinder || rate.rate_per_cylinder <= 0) {
          toast.error('All rates must be positive numbers');
          return;
        }
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
        [formData.entity_type === 'customer' ? 'customer_id' : 'dealer_id']: parseInt(formData.entity_id),
        rates: rates,
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

    // Reset entity selection when changing type
    if (field === 'entity_type') {
      setFormData(prev => ({
        ...prev,
        entity_id: ''
      }));
    }
  };

  const handleRateChange = (cylinderTypeId: number, rateValue: string) => {
    const rate = parseFloat(rateValue) || 0;
    setRates(prev => {
      const existing = prev.find(r => r.cylinder_type_id === cylinderTypeId);
      if (existing) {
        return prev.map(r =>
          r.cylinder_type_id === cylinderTypeId
            ? { ...r, rate_per_cylinder: rate }
            : r
        );
      } else {
        return [...prev, { cylinder_type_id: cylinderTypeId, rate_per_cylinder: rate }];
      }
    });
  };

  const getCylinderTypeName = (cylinderTypeId: number) => {
    const cylinderType = cylinderTypes.find(ct => ct.CylinderTypeId === cylinderTypeId);
    return cylinderType ? cylinderType.Capacity : 'Unknown';
  };

  const getEntityOptions = () => {
    if (formData.entity_type === 'customer') {
      return customers.filter(c => c.IsActive);
    } else {
      return dealers.filter(d => d.IsActive);
    }
  };

  const getSelectedEntityName = () => {
    if (!formData.entity_id) return '';
    const entity = getEntityOptions().find(e =>
      (formData.entity_type === 'customer' ? (e as CustomerMaster).CustomerId : (e as DealerMaster).DealerId) === parseInt(formData.entity_id)
    );
    return entity ? (formData.entity_type === 'customer' ? (entity as CustomerMaster).CustomerName : (entity as DealerMaster).DealerName) : '';
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
                  placeholder="e.g., Standard Customer Rate Contract"
                  required
                  maxLength={100}
                />
              </div>

              {/* Entity Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Apply to *</span>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('entity_type', 'customer')}
                    className={`p-3 border rounded-lg flex items-center space-x-2 transition-all ${
                      formData.entity_type === 'customer'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('entity_type', 'dealer')}
                    className={`p-3 border rounded-lg flex items-center space-x-2 transition-all ${
                      formData.entity_type === 'dealer'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span className="text-sm font-medium">Dealer</span>
                  </button>
                </div>
              </div>

              {/* Entity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    {formData.entity_type === 'customer' ? <User className="w-4 h-4 text-gray-500" /> : <Building className="w-4 h-4 text-gray-500" />}
                    <span>Select {formData.entity_type === 'customer' ? 'Customer' : 'Dealer'} *</span>
                  </div>
                </label>
                <select
                  value={formData.entity_id}
                  onChange={(e) => handleInputChange('entity_id', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">
                    Select {formData.entity_type === 'customer' ? 'customer' : 'dealer'}...
                  </option>
                  {getEntityOptions().map((entity) => (
                    <option
                      key={formData.entity_type === 'customer' ? (entity as CustomerMaster).CustomerId : (entity as DealerMaster).DealerId}
                      value={formData.entity_type === 'customer' ? (entity as CustomerMaster).CustomerId : (entity as DealerMaster).DealerId}
                    >
                      {formData.entity_type === 'customer' ? (entity as CustomerMaster).CustomerName : (entity as DealerMaster).DealerName}
                    </option>
                  ))}
                </select>
                {getSelectedEntityName() && (
                  <div className="mt-2 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Selected: {getSelectedEntityName()}</span>
                  </div>
                )}
              </div>

              {/* Rates for Each Cylinder Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>Rates per Cylinder Type *</span>
                  </div>
                </label>
                <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {cylinderTypes.map((cylinderType) => {
                    const existingRate = rates.find(r => r.cylinder_type_id === cylinderType.CylinderTypeId);
                    return (
                      <div key={cylinderType.CylinderTypeId} className="flex items-center justify-between space-x-3">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{cylinderType.Capacity}</span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-sm text-gray-500">₹</span>
                          <input
                            type="number"
                            value={existingRate?.rate_per_cylinder || ''}
                            onChange={(e) => handleRateChange(cylinderType.CylinderTypeId, e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {rates.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Set rates for each cylinder type above
                  </div>
                )}
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
                        <AlertTriangle className="w-4 h-4 text-red-600" />
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
