'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Eye, Search, FileText, AlertTriangle, CheckCircle, XCircle, Users, Package, DollarSign, Calendar, Building, User, ChevronDown, ChevronRight } from 'lucide-react';
import { RateContractMaster } from '../../../../types/rateContract';
import { rateContractApi } from '../../../../lib/api/rateContractApi';
import { customerApi } from '../../../../lib/api/customerApi';
import { dealerApi } from '../../../../lib/api/dealerApi';
import { RateContractFormModal } from '../../../../components/ui/RateContractFormModal';
import { CustomerMaster } from '../../../../types/customer';
import { DealerMaster } from '../../../../types/dealer';
import toast from 'react-hot-toast';

interface CompanyEntity {
  id: number;
  name: string;
  type: 'customer' | 'dealer';
  contract?: RateContractMaster;
  hasContract: boolean;
}

export default function RateContractsPage() {
  const [companies, setCompanies] = useState<CompanyEntity[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyEntity[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RateContractMaster | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyEntity | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [companies, searchTerm]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [contractsData, customersData, dealersData] = await Promise.all([
        rateContractApi.getAllRateContracts(),
        customerApi.getAllCustomers(),
        dealerApi.getAllDealers()
      ]);

      // Create company entities with contract status
      const companyEntities: CompanyEntity[] = [];

      // Add customers
      customersData.filter(c => c.IsActive).forEach(customer => {
        const contract = contractsData.find(c => c.customer_id === customer.CustomerId);
        companyEntities.push({
          id: customer.CustomerId,
          name: customer.CustomerName,
          type: 'customer',
          contract,
          hasContract: !!contract
        });
      });

      // Add dealers
      dealersData.filter(d => d.IsActive).forEach(dealer => {
        const contract = contractsData.find(c => c.dealer_id === dealer.DealerId);
        companyEntities.push({
          id: dealer.DealerId,
          name: dealer.DealerName,
          type: 'dealer',
          contract,
          hasContract: !!contract
        });
      });

      setCompanies(companyEntities);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContract = (company: CompanyEntity) => {
    setSelectedCompany(company);
    setSelectedContract(null);
    setIsModalOpen(true);
  };

  const handleEditContract = (contract: RateContractMaster) => {
    setSelectedContract(contract);
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  const handleViewContract = (company: CompanyEntity) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(company.id)) {
      newExpanded.delete(company.id);
    } else {
      newExpanded.add(company.id);
    }
    setExpandedCompanies(newExpanded);
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
            <p className="text-sm text-gray-600">Manage pricing contracts for companies (one contract per company)</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Company List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading companies...</span>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No companies found matching your search' : 'No active companies found'}
            </p>
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Company Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${company.hasContract ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div className="flex items-center space-x-2">
                      {company.type === 'customer' ? (
                        <User className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Building className="w-5 h-5 text-purple-600" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{company.type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {company.hasContract ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Has Contract
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        No Contract
                      </span>
                    )}

                    <button
                      onClick={() => handleViewContract(company)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title={expandedCompanies.has(company.id) ? "Hide details" : "View details"}
                    >
                      {expandedCompanies.has(company.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {!company.hasContract && (
                      <button
                        onClick={() => handleCreateContract(company)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Contract
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contract Details (Expandable) */}
              <AnimatePresence>
                {expandedCompanies.has(company.id) && company.contract && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200"
                  >
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Contract Info */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Contract Details</h4>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Name:</span> {company.contract.contract_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">ID:</span> {company.contract.rate_contract_id}
                            </p>
                          </div>
                        </div>

                        {/* Rates */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Rates</h4>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {company.contract.rates.map((rate) => (
                              <div key={rate.cylinder_type_id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Cylinder {rate.cylinder_type_id}:</span>
                                <span className="font-medium">₹{rate.rate_per_cylinder.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Validity Period */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Validity Period</h4>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">From:</span> {formatDate(company.contract.valid_from)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">To:</span> {formatDate(company.contract.valid_to)}
                            </p>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Status & Actions</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const status = getContractStatus(company.contract!.valid_from, company.contract!.valid_to, company.contract!.is_active);
                                return status.status === 'active' ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">{status.label}</span>
                                  </>
                                ) : status.status === 'expired' ? (
                                  <>
                                    <XCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600">{status.label}</span>
                                  </>
                                ) : status.status === 'upcoming' ? (
                                  <>
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm text-blue-600">{status.label}</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm text-gray-600">{status.label}</span>
                                  </>
                                );
                              })()}
                            </div>

                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditContract(company.contract!)}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Rate Contract Form Modal */}
      <RateContractFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rateContract={selectedContract}
        selectedCompany={selectedCompany}
        onSuccess={fetchData}
      />
    </div>
  );
}
