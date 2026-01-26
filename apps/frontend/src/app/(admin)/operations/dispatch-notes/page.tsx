'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Truck, Users, Calendar, FileText, RefreshCw, Save, CheckCircle, XCircle, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryOrderApi } from '@/lib/api/deliveryOrderApi';
import { cylinderExchangeApi } from '@/lib/api/cylinderExchangeApi';
import { vehicleApi } from '@/lib/api/vehicleApi';
import { driverApi } from '@/lib/api/driverApi';
import { DeliveryOrder, ORDER_STATUSES } from '@/types/deliveryOrder';
import { OrderExchangeTracking, DailyReconciliation, VARIANCE_TYPES, VARIANCE_REASONS, RECONCILIATION_STATUSES } from '@/types/cylinderExchange';
import { VehicleMaster } from '@/types/vehicle';
import { DriverMaster } from '@/types/driver';

export default function DispatchNotesPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  
  // Dispatch modal state
  const [dispatchData, setDispatchData] = useState({
    vehicle_id: 0,
    driver_id: 0,
    plan_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Exchange modal state
  const [exchangeData, setExchangeData] = useState({
    order_id: 0,
    filled_delivered: 0,
    empty_collected: 0,
    expected_empty: 0,
    variance_reason: '',
    customer_acknowledged: false,
    notes: ''
  });
  
  // Reconciliation modal state
  const [reconciliationData, setReconciliationData] = useState({
    plan_id: 0,
    reconciliation_notes: ''
  });
  
  // Inventory modal state
  const [inventoryData, setInventoryData] = useState<Array<{
    cylinder_type_id: number;
    cylinder_description: string;
    actual_remaining: number;
    variance_reason?: string;
  }>>([]);
  
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [drivers, setDrivers] = useState<DriverMaster[]>([]);
  const [exchangeTracking, setExchangeTracking] = useState<OrderExchangeTracking[]>([]);
  const [reconciliations, setReconciliations] = useState<DailyReconciliation[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchVehicles();
    fetchDrivers();
    fetchExchangeTracking();
    fetchReconciliations();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const filters: any = { status: statusFilter };
      if (searchTerm) filters.customer_name = searchTerm;

      const response = await deliveryOrderApi.getOrders(filters);
      setOrders(response);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await vehicleApi.getAllVehicles();
      setVehicles(response);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await driverApi.getAllDrivers();
      setDrivers(response);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const fetchExchangeTracking = async () => {
    try {
      const response = await cylinderExchangeApi.getExchangeTracking();
      setExchangeTracking(response);
    } catch (error) {
      console.error('Failed to fetch exchange tracking:', error);
    }
  };

  const fetchReconciliations = async () => {
    try {
      const response = await cylinderExchangeApi.getDailyReconciliations();
      setReconciliations(response);
    } catch (error) {
      console.error('Failed to fetch reconciliations:', error);
    }
  };

  const handleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleCreateDispatch = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    if (!dispatchData.vehicle_id || !dispatchData.driver_id) {
      toast.error('Please select vehicle and driver');
      return;
    }

    try {
      // Create delivery plan (dispatch note)
      const planResponse = await deliveryOrderApi.createPlan({
        plan_date: dispatchData.plan_date,
        vehicle_id: dispatchData.vehicle_id,
        driver_id: dispatchData.driver_id,
        notes: dispatchData.notes,
        created_by: 1, // TODO: Get from auth context
        orders: selectedOrders.map((orderId, index) => ({
          order_id: orderId,
          sequence_number: index + 1
        }))
      });

      toast.success('Dispatch note created successfully!');
      setShowDispatchModal(false);
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error('Failed to create dispatch:', error);
      toast.error('Failed to create dispatch note');
    }
  };

  const handleRecordExchange = async () => {
    if (!exchangeData.order_id) {
      toast.error('Please select an order');
      return;
    }

    try {
      await cylinderExchangeApi.recordExchange({
        order_id: exchangeData.order_id,
        filled_delivered: exchangeData.filled_delivered,
        empty_collected: exchangeData.empty_collected,
        expected_empty: exchangeData.expected_empty,
        variance_reason: exchangeData.variance_reason || undefined,
        customer_acknowledged: exchangeData.customer_acknowledged,
        notes: exchangeData.notes || undefined
      });

      toast.success('Exchange recorded successfully!');
      setShowExchangeModal(false);
      fetchExchangeTracking();
    } catch (error) {
      console.error('Failed to record exchange:', error);
      toast.error('Failed to record exchange');
    }
  };

  const handleCreateReconciliation = async () => {
    if (!reconciliationData.plan_id) {
      toast.error('Please select a plan');
      return;
    }

    try {
      await cylinderExchangeApi.createDailyReconciliation({
        plan_id: reconciliationData.plan_id,
        reconciled_by: 1, // TODO: Get from auth context
        reconciliation_notes: reconciliationData.reconciliation_notes || undefined
      });

      toast.success('Daily reconciliation created successfully!');
      setShowReconciliationModal(false);
      fetchReconciliations();
    } catch (error) {
      console.error('Failed to create reconciliation:', error);
      toast.error('Failed to create reconciliation');
    }
  };

  const handleCountInventory = async () => {
    if (!reconciliationData.plan_id) {
      toast.error('Please select a plan');
      return;
    }

    try {
      await cylinderExchangeApi.countVehicleInventory({
        plan_id: reconciliationData.plan_id,
        inventory_items: inventoryData.map(item => ({
          cylinder_type_id: item.cylinder_type_id,
          actual_remaining: item.actual_remaining,
          variance_reason: item.variance_reason,
          counted_by: 1 // TODO: Get from auth context
        }))
      });

      toast.success('Vehicle inventory counted successfully!');
      setShowInventoryModal(false);
    } catch (error) {
      console.error('Failed to count inventory:', error);
      toast.error('Failed to count inventory');
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const getVarianceColor = (varianceType: string) => {
    const varianceConfig = VARIANCE_TYPES.find(v => v.value === varianceType);
    return varianceConfig?.color || 'gray';
  };

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Notes & Cylinder Exchange</h1>
          <p className="text-gray-600">Manage daily dispatch operations and cylinder exchanges</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDispatchModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Truck className="w-4 h-4" />
            Create Dispatch
          </button>
          <button
            onClick={() => setShowExchangeModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4" />
            Record Exchange
          </button>
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <FileText className="w-4 h-4" />
            Daily Reconciliation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PENDING">Pending Orders</option>
            <option value="CONFIRMED">Confirmed Orders</option>
            <option value="ASSIGNED">Assigned Orders</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Orders ({filteredOrders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(filteredOrders.map(o => o.order_id));
                        } else {
                          setSelectedOrders([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.order_id)}
                        onChange={() => handleOrderSelection(order.order_id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.location_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.order_status)}`}>
                        {ORDER_STATUSES.find(s => s.value === order.order_status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.requested_delivery_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total_ordered_qty}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setExchangeData({
                              ...exchangeData,
                              order_id: order.order_id,
                              expected_empty: order.total_ordered_qty // Default expected empties
                            });
                            setShowExchangeModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setReconciliationData({
                              ...reconciliationData,
                              plan_id: 0 // TODO: Get from plan
                            });
                            setShowInventoryModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Exchange Tracking */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Exchange Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filled Delivered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empty Collected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Empty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acknowledged</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exchangeTracking.map((exchange) => (
                <tr key={exchange.exchange_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.order_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.filled_delivered}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.empty_collected}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.expected_empty}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exchange.variance_qty}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVarianceColor(exchange.variance_type)}`}>
                      {exchange.variance_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {exchange.customer_acknowledged ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Reconciliations */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Daily Reconciliations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Excess</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reconciliations.map((recon) => (
                <tr key={recon.reconciliation_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recon.plan_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(recon.reconciliation_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recon.total_orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recon.total_shortages}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recon.total_excess}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recon.status)}`}>
                      {RECONCILIATION_STATUSES.find(s => s.value === recon.status)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setReconciliationData({
                          ...reconciliationData,
                          plan_id: recon.plan_id
                        });
                        setShowInventoryModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Count Inventory
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Dispatch Note</h2>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selected Orders</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {selectedOrders.length > 0 ? (
                      <div className="space-y-1">
                        {selectedOrders.map(orderId => {
                          const order = orders.find(o => o.order_id === orderId);
                          return (
                            <div key={orderId} className="flex justify-between text-sm">
                              <span>{order?.order_number}</span>
                              <span className="text-gray-600">{order?.customer_name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500">No orders selected</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                    <select
                      value={dispatchData.vehicle_id}
                      onChange={(e) => setDispatchData({...dispatchData, vehicle_id: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Select Vehicle</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                          {vehicle.vehicle_number} - {vehicle.vehicle_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                    <select
                      value={dispatchData.driver_id}
                      onChange={(e) => setDispatchData({...dispatchData, driver_id: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver.driver_id} value={driver.driver_id}>
                          {driver.driver_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchData.plan_date}
                    onChange={(e) => setDispatchData({...dispatchData, plan_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={dispatchData.notes}
                    onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDispatchModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDispatch}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Dispatch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Modal */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Record Cylinder Exchange</h2>
                <button
                  onClick={() => setShowExchangeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <select
                    value={exchangeData.order_id}
                    onChange={(e) => setExchangeData({...exchangeData, order_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Order</option>
                    {orders.map(order => (
                      <option key={order.order_id} value={order.order_id}>
                        {order.order_number} - {order.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filled Delivered</label>
                    <input
                      type="number"
                      value={exchangeData.filled_delivered}
                      onChange={(e) => setExchangeData({...exchangeData, filled_delivered: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empty Collected</label>
                    <input
                      type="number"
                      value={exchangeData.empty_collected}
                      onChange={(e) => setExchangeData({...exchangeData, empty_collected: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Empty</label>
                    <input
                      type="number"
                      value={exchangeData.expected_empty}
                      onChange={(e) => setExchangeData({...exchangeData, expected_empty: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variance</label>
                    <input
                      type="number"
                      value={exchangeData.empty_collected - exchangeData.expected_empty}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variance Reason</label>
                  <select
                    value={exchangeData.variance_reason}
                    onChange={(e) => setExchangeData({...exchangeData, variance_reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Reason</option>
                    {VARIANCE_REASONS.map(reason => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exchangeData.customer_acknowledged}
                    onChange={(e) => setExchangeData({...exchangeData, customer_acknowledged: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Customer Acknowledged</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={exchangeData.notes}
                    onChange={(e) => setExchangeData({...exchangeData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowExchangeModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordExchange}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Record Exchange
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconciliationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Daily Reconciliation</h2>
                <button
                  onClick={() => setShowReconciliationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan ID</label>
                  <input
                    type="number"
                    value={reconciliationData.plan_id}
                    onChange={(e) => setReconciliationData({...reconciliationData, plan_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter plan ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reconciliation Notes</label>
                  <textarea
                    value={reconciliationData.reconciliation_notes}
                    onChange={(e) => setReconciliationData({...reconciliationData, reconciliation_notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any reconciliation notes..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowReconciliationModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateReconciliation}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create Reconciliation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Vehicle End-of-Day Inventory</h2>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan ID</label>
                  <input
                    type="number"
                    value={reconciliationData.plan_id}
                    onChange={(e) => setReconciliationData({...reconciliationData, plan_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter plan ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cylinder Inventory</label>
                  <div className="space-y-3">
                    {inventoryData.map((item, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.cylinder_description}
                            onChange={(e) => {
                              const newInventory = [...inventoryData];
                              newInventory[index].cylinder_description = e.target.value;
                              setInventoryData(newInventory);
                            }}
                            placeholder="Cylinder description"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={item.actual_remaining}
                            onChange={(e) => {
                              const newInventory = [...inventoryData];
                              newInventory[index].actual_remaining = Number(e.target.value);
                              setInventoryData(newInventory);
                            }}
                            placeholder="Actual remaining"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                        <div className="w-48">
                          <input
                            type="text"
                            value={item.variance_reason || ''}
                            onChange={(e) => {
                              const newInventory = [...inventoryData];
                              newInventory[index].variance_reason = e.target.value;
                              setInventoryData(newInventory);
                            }}
                            placeholder="Variance reason"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setInventoryData([...inventoryData, { cylinder_type_id: 0, cylinder_description: '', actual_remaining: 0 }])}
                    className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <PlusCircle className="w-4 h-4 inline mr-2" />
                    Add Cylinder Type
                  </button>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowInventoryModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCountInventory}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Count Inventory
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}