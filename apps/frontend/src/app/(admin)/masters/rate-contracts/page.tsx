'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, FileText, AlertTriangle, CheckCircle, XCircle, Users, Package, DollarSign, Calendar } from 'lucide-react';
import { RateContractMaster } from '../../../../types/rateContract';
import { rateContractApi } from '../../../../lib/api/rateContractApi';
import { RateContractFormModal } from '../../../../components/ui/RateContractFormModal';
import toast from 'react-hot-toast';

export default function RateContractsPage() {
  const [rateContracts, setRateContracts] = useState<RateContractMaster[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<RateContractMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RateContractMaster | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchRateContracts();
  }, []);

  useEffect(() => {
    const filtered = rateContracts.filter(contract =>
      contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.customer_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.cylinder_type_name && contract.cylinder_type_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredContracts(filtered);
  }, [rateContracts, searchTerm]);

  const fetchRateContracts = async () => {
    try {
      setIsLoading(true);
      const data = await rateContractApi.getAllRateContracts();
      setRateContracts(data);
    } catch (error) {
      console.error('Error fetching rate contracts:', error);
      toast.error('Failed to load rate contracts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContract = () => {
    setSelectedContract(null);
    setIsModalOpen(true);
  };

  const handleEditContract = (contract: RateContractMaster) => {
    setSelectedContract(contract);
    setIsModalOpen(true);
  };

  const handleDeleteContract = async (id: number) => {
    try {
      await rateContractApi.deleteRateContract(id);
      toast.success('Rate contract deleted successfully!');
      fetchRateContracts();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting rate contract:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete rate contract');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContractStatus = (validFrom: string, validTo: string, isActive: boolean) => {
    if (!isActive) {
      return { status: 'inactive', label: 'Inactive', color: 'gray' };
    }

    const now = new Date();
    const from = new Date(validFrom);
    const to = new Date(validTo);

    if (now < from) {
      return { status: 'upcoming', label: 'Upcoming', color: 'blue' };
    } else if (now > to) {
      return { status: 'expired', label: 'Expired', color: 'red' };
    } else {
      return { status: 'active', label: 'Active', color: 'green' };
    }
  };

  const getCustomerTypeLabel = (customerType: string) => {
    switch (customerType) {
      case 'DIRECT':
        return 'Direct Customer';
      case 'SUB_DEALER':
        return 'Sub-dealer';
      case 'ALL':
        return 'All Customers';
      default:
        return customerType;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate Contracts</h1>
            <p className="text-sm text-gray-600">Manage pricing contracts for different customer types</p>
          </div>
        </div>
        <button
          onClick={handleCreateContract}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contract</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search contracts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contract Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cylinder Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Validity Period
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading rate contracts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-600">
                        {searchTerm ? 'No contracts found matching your search' : 'No rate contracts created yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const contractStatus = getContractStatus(contract.valid_from, contract.valid_to, contract.is_active);
                  return (
                    <motion.tr
                      key={contract.rate_contract_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900">{contract.contract_name}</div>
                          <div className="text-sm text-gray-600">ID: {contract.rate_contract_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {getCustomerTypeLabel(contract.customer_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {contract.cylinder_type_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            ₹{contract.rate_per_cylinder.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              From: {formatDate(contract.valid_from)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              To: {formatDate(contract.valid_to)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {contractStatus.status === 'active' ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-600">{contractStatus.label}</span>
                            </>
                          ) : contractStatus.status === 'expired' ? (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm text-red-600">{contractStatus.label}</span>
                            </>
                          ) : contractStatus.status === 'upcoming' ? (
                            <>
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-600">{contractStatus.label}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-600">{contractStatus.label}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditContract(contract)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit contract"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(contract.rate_contract_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete contract"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Rate Contract</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete this rate contract? This action cannot be undone and may affect existing deliveries.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteContract(deleteConfirmId)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rate Contract Form Modal */}
      <RateContractFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rateContract={selectedContract}
        onSuccess={fetchRateContracts}
      />
    </div>
  );
}
