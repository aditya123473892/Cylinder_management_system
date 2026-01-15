'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, Truck, FileText, Plus, Eye, Check, X, AlertTriangle, Download } from 'lucide-react';
import { GrWithDelivery } from '../../../../types/gr';
import { grApi } from '../../../../lib/api/grApi';
import { deliveryTransactionApi } from '../../../../lib/api/deliveryTransactionApi';
import { DeliveryTransaction } from '../../../../types/deliveryTransaction';
import { PDFGenerator } from '../../../../lib/pdfGenerator';
import toast from 'react-hot-toast';

export default function GrPage() {
  const [grs, setGrs] = useState<GrWithDelivery[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryTransaction | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [grsData, deliveriesData] = await Promise.all([
        grApi.getAllGrs(),
        deliveryTransactionApi.getAllDeliveryTransactions(),
      ]);

      console.log('GRs data:', grsData);
      console.log('Deliveries data:', deliveriesData);

      setGrs(grsData);
      // Filter deliveries that don't have GRs yet
      const deliveriesWithoutGr = deliveriesData.filter(delivery =>
        !grsData.some(gr => gr.delivery_id === delivery.delivery_id)
      );

      console.log('Deliveries without GR:', deliveriesWithoutGr);

      setDeliveries(deliveriesWithoutGr);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'FINALIZED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FINALIZED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApprove = async (grId: number) => {
    try {
      setIsActionLoading(`approve-${grId}`);
      await grApi.approveGr(grId, {});
      toast.success('GR approved successfully');
      fetchData();
    } catch (error) {
      console.error('Error approving GR:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve GR');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleFinalize = async (grId: number) => {
    try {
      setIsActionLoading(`finalize-${grId}`);
      await grApi.finalizeGr(grId);
      toast.success('GR finalized successfully');
      fetchData();
    } catch (error) {
      console.error('Error finalizing GR:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to finalize GR');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCloseTrip = async (grId: number) => {
    try {
      setIsActionLoading(`close-${grId}`);
      await grApi.closeTrip(grId);
      toast.success('Trip closed successfully');
      fetchData();
    } catch (error) {
      console.error('Error closing trip:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to close trip');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateGr = async () => {
    if (!selectedDelivery || !advanceAmount) {
      toast.error('Please select a delivery and enter advance amount');
      return;
    }

    try {
      setIsActionLoading('create');
      await grApi.createGr({
        delivery_id: selectedDelivery.delivery_id,
        advance_amount: parseFloat(advanceAmount),
      });
      toast.success('GR created successfully');
      setShowCreateModal(false);
      setSelectedDelivery(null);
      setAdvanceAmount('');
      fetchData();
    } catch (error) {
      console.error('Error creating GR:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create GR');
    } finally {
      setIsActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Goods Receipt (GR) Management</h1>
            <p className="text-sm text-gray-600">Approve, finalize, and close delivery trips</p>
          </div>
        </div>
     
      </div>

      {/* GR List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active GRs</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {grs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No GRs found</h3>
              <p className="text-gray-600">Create your first GR to get started</p>
            </div>
          ) : (
            grs.map((gr) => (
              <motion.div
                key={gr.gr_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(gr.gr_status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">GR-{gr.gr_id}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(gr.gr_status)}`}>
                          {gr.gr_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {gr.delivery_info.customer_name} • {gr.delivery_info.vehicle_number} • {gr.delivery_info.driver_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(gr.created_at).toLocaleDateString()} •
                        Advance: ₹{gr.advance_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {gr.gr_status === 'PENDING' && (
                      <button
                        onClick={() => handleApprove(gr.gr_id)}
                        disabled={isActionLoading === `approve-${gr.gr_id}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isActionLoading === `approve-${gr.gr_id}` ? 'Approving...' : 'Approve'}</span>
                      </button>
                    )}

                    {gr.gr_status === 'APPROVED' && (
                      <button
                        onClick={() => handleFinalize(gr.gr_id)}
                        disabled={isActionLoading === `finalize-${gr.gr_id}`}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>{isActionLoading === `finalize-${gr.gr_id}` ? 'Finalizing...' : 'Finalize'}</span>
                      </button>
                    )}

                    {(gr.gr_status === 'APPROVED' || gr.gr_status === 'FINALIZED') && (
                      <button
                        onClick={() => handleCloseTrip(gr.gr_id)}
                        disabled={isActionLoading === `close-${gr.gr_id}`}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-1"
                      >
                        <Truck className="w-3 h-3" />
                        <span>{isActionLoading === `close-${gr.gr_id}` ? 'Closing...' : 'Close Trip'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => PDFGenerator.generateGR(gr)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>

                 
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create GR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Goods Receipt</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Delivery Transaction
                </label>
                <select
                  value={selectedDelivery?.delivery_id?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Selected value:', value);
                    if (!value) {
                      setSelectedDelivery(null);
                      return;
                    }
                    const delivery = deliveries.find(d => d.delivery_id === parseInt(value));
                    console.log('Found delivery:', delivery);
                    setSelectedDelivery(delivery || null);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select delivery transaction</option>
                  {deliveries.map((delivery) => (
                    <option key={delivery.delivery_id} value={delivery.delivery_id.toString()}>
                      DT-{delivery.delivery_id} - {delivery.customer_name} ({delivery.vehicle_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedDelivery(null);
                  setAdvanceAmount('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGr}
                disabled={isActionLoading === 'create' || !selectedDelivery || !advanceAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isActionLoading === 'create' ? 'Creating...' : 'Create GR'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
