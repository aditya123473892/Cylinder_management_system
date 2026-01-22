'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { DealerMaster } from '../../../../types/dealer';
import { dealerApi } from '../../../../lib/api/dealerApi';
import { LocationMaster } from '../../../../types/location';
import { locationApi } from '../../../../lib/api/locationApi';
import { DealerFormModal } from '../../../../components/ui/DealerFormModal';
import toast, { Toaster } from 'react-hot-toast';

export default function DealersPage() {
  const [dealers, setDealers] = useState<DealerMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<DealerMaster | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDealers();
    loadLocations();
  }, []);

  const loadDealers = async () => {
    try {
      setLoading(true);
      const data = await dealerApi.getAllDealers();
      setDealers(data);
    } catch (error) {
      toast.error('Failed to load dealers');
      console.error('Error loading dealers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await locationApi.getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      await dealerApi.createDealer(data);
      toast.success('Dealer created successfully');
      await loadDealers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create dealer');
      console.error('Error creating dealer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingDealer) return;

    setSubmitting(true);
    try {
      await dealerApi.updateDealer(editingDealer.DealerId, data);
      toast.success('Dealer updated successfully');
      await loadDealers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update dealer');
      console.error('Error updating dealer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dealer?')) return;

    try {
      await dealerApi.deleteDealer(id);
      toast.success('Dealer deleted successfully');
      await loadDealers();
    } catch (error) {
      toast.error('Failed to delete dealer');
      console.error('Error deleting dealer:', error);
    }
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find(l => l.LocationId === locationId);
    return location ? location.LocationName : 'Unknown Location';
  };

  const getParentDealerName = (parentDealerId: number | null) => {
    if (!parentDealerId) return '-';
    const parent = dealers.find(d => d.DealerId === parentDealerId);
    return parent ? parent.DealerName : 'Unknown Dealer';
  };

  const getImageSrc = (imageData: string | null) => {
    if (!imageData) return null;
    
    // If already has data URI prefix, return as-is
    if (imageData.startsWith('data:')) {
      return imageData;
    }
    
    // Otherwise, add the base64 prefix
    return `data:image/jpeg;base64,${imageData}`;
  };

  const filteredDealers = dealers.filter(dealer =>
    dealer.DealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.DealerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLocationName(dealer.LocationId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingDealer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dealer: DealerMaster) => {
    setEditingDealer(dealer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDealer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealers Master</h1>
          <p className="text-gray-600">Manage dealers and their information</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Dealer
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search dealers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
               
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aadhaar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PAN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
          
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No dealers found matching your search.' : 'No dealers found.'}
                  </td>
                </tr>
              ) : (
                filteredDealers.map((dealer) => (
                  <motion.tr
                    key={dealer.DealerId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dealer.DealerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dealer.DealerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dealer.DealerType}
                    </td>
                   
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLocationName(dealer.LocationId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dealer.AadhaarImage ? (
                        <img
                          src={getImageSrc(dealer.AadhaarImage)}
                          alt="Aadhaar"
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            console.error('Failed to load Aadhaar image for dealer:', dealer.DealerId);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dealer.PanImage ? (
                        <img
                          src={getImageSrc(dealer.PanImage)}
                          alt="PAN"
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            console.error('Failed to load PAN image for dealer:', dealer.DealerId);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        dealer.IsActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dealer.IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                 
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(dealer)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dealer Form Modal */}
      <DealerFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingDealer ? handleUpdate : handleCreate}
        dealer={editingDealer}
        isLoading={submitting}
      />

      <Toaster />
    </div>
  );
}