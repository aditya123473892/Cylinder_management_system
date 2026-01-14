'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { CylinderTypeMaster } from '../../../../types/cylinderType';
import { cylinderTypeApi } from '../../../../lib/api/cylinderTypeApi';
import { CylinderTypeFormModal } from '../../../../components/ui/CylinderTypeFormModal';
import toast, { Toaster } from 'react-hot-toast';

export default function CylinderTypesPage() {
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCylinderType, setEditingCylinderType] = useState<CylinderTypeMaster | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCylinderTypes();
  }, []);

  const loadCylinderTypes = async () => {
    try {
      setLoading(true);
      const data = await cylinderTypeApi.getAllCylinderTypes();
      setCylinderTypes(data);
    } catch (error) {
      toast.error('Failed to load cylinder types');
      console.error('Error loading cylinder types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      await cylinderTypeApi.createCylinderType(data);
      toast.success('Cylinder type created successfully');
      await loadCylinderTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create cylinder type');
      console.error('Error creating cylinder type:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingCylinderType) return;

    setSubmitting(true);
    try {
      await cylinderTypeApi.updateCylinderType(editingCylinderType.CylinderTypeId, data);
      toast.success('Cylinder type updated successfully');
      await loadCylinderTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update cylinder type');
      console.error('Error updating cylinder type:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cylinder type?')) return;

    try {
      await cylinderTypeApi.deleteCylinderType(id);
      toast.success('Cylinder type deleted successfully');
      await loadCylinderTypes();
    } catch (error) {
      toast.error('Failed to delete cylinder type');
      console.error('Error deleting cylinder type:', error);
    }
  };

  const filteredCylinderTypes = cylinderTypes.filter(cylinderType =>
    cylinderType.Capacity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCylinderType(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cylinderType: CylinderTypeMaster) => {
    setEditingCylinderType(cylinderType);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCylinderType(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Cylinder Types Master</h1>
          <p className="text-gray-600">Manage cylinder types and their specifications</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Cylinder Type
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cylinder types..."
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
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Height (CM)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturing Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCylinderTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No cylinder types found matching your search.' : 'No cylinder types found.'}
                  </td>
                </tr>
              ) : (
                filteredCylinderTypes.map((cylinderType) => (
                  <motion.tr
                    key={cylinderType.CylinderTypeId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cylinderType.CylinderTypeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cylinderType.Capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cylinderType.IsActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cylinderType.IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cylinderType.HeightCM || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cylinderType.ManufacturingDate
                        ? new Date(cylinderType.ManufacturingDate).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(cylinderType)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cylinderType.CylinderTypeId)}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal */}
      <CylinderTypeFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingCylinderType ? handleUpdate : handleCreate}
        cylinderType={editingCylinderType}
        isLoading={submitting}
      />
    </div>
  );
}
