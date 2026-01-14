'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Download, Eye, Calendar, Truck, User, MapPin, Package } from 'lucide-react';
import { DeliveryTransaction } from '../../../../types/deliveryTransaction';
import { deliveryTransactionApi } from '../../../../lib/api/deliveryTransactionApi';
import toast from 'react-hot-toast';

export default function DeliveryReportsPage() {
  const [transactions, setTransactions] = useState<DeliveryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<DeliveryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<DeliveryTransaction | null>(null);

  useEffect(() => {
    fetchDeliveryTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm]);

  const fetchDeliveryTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await deliveryTransactionApi.getAllDeliveryTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching delivery transactions:', error);
      toast.error('Failed to load delivery transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(transaction =>
      
      transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.from_location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.to_location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.delivery_id?.toString().includes(searchTerm)
      
    );

    setFilteredTransactions(filtered);
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeString;
    }
  };

  const calculateTransactionSummary = () => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_bill_amount || 0), 0);

    return { totalTransactions, totalAmount };
  };

  const { totalTransactions, totalAmount } = calculateTransactionSummary();

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
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Transaction Reports</h1>
            <p className="text-sm text-gray-600">View and analyze all delivery transactions</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(transactions.map(t => t.vehicle_id)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, vehicle, location, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toast.error('Export feature is not yet implemented')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Delivery Transactions ({filteredTransactions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle & Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cylinders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Package className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No transactions match your search' : 'No delivery transactions found'}
                      </p>
                      {!searchTerm && (
                        <p className="text-sm text-gray-400">
                          Create your first delivery transaction to see it here
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.delivery_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{transaction.delivery_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{transaction.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{transaction.to_location_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <Truck className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-900">{transaction.vehicle_number}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{transaction.driver_name || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{transaction.total_delivered_qty || 0} delivered</div>
                        <div className="text-xs text-gray-500">{transaction.total_returned_qty || 0} returned</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ₹{(transaction.total_bill_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDateTime(transaction.delivery_datetime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTransaction(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction Details #{selectedTransaction.delivery_id}
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Type</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.customer_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">From Location</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.from_location_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">To Location</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.to_location_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vehicle</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.vehicle_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Driver</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.driver_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Delivery Date & Time</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedTransaction.delivery_datetime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rate Contract</label>
                  <p className="text-sm text-gray-900">#{selectedTransaction.selected_rate_contract_id}</p>
                </div>
              </div>

              {/* Cylinder Details */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Cylinder Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Delivered:</span>
                    <span className="ml-2 font-medium">{selectedTransaction.total_delivered_qty || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Returned:</span>
                    <span className="ml-2 font-medium">{selectedTransaction.total_returned_qty || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Net Quantity:</span>
                    <span className="ml-2 font-medium">{(selectedTransaction.total_delivered_qty || 0) - (selectedTransaction.total_returned_qty || 0)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">₹{(selectedTransaction.total_bill_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
