'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Eye, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryOrderApi } from '@/lib/api/deliveryOrderApi';
import { DeliveryOrder, ORDER_STATUSES, ORDER_PRIORITIES, CreateDeliveryOrderRequest, CreateDeliveryOrderLineRequest } from '@/types/deliveryOrder';
import { customerApi } from '@/lib/api/customerApi';
import { locationApi } from '@/lib/api/locationApi';
import { rateContractApi } from '@/lib/api/rateContractApi';
import { cylinderTypeApi } from '@/lib/api/cylinderTypeApi';
import { CustomerMaster } from '@/types/customer';
import { LocationMaster } from '@/types/location';
import { RateContractMaster } from '@/types/rateContract';
import { CylinderTypeMaster } from '@/types/cylinderType';

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [rateContracts, setRateContracts] = useState<RateContractMaster[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [orderLines, setOrderLines] = useState<CreateDeliveryOrderLineRequest[]>([]);
  const [formData, setFormData] = useState({
    order_number: '',
    customer_id: 0,
    location_id: 0,
    rate_contract_id: 0,
    order_date: new Date().toISOString().split('T')[0],
    requested_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requested_delivery_time: '',
    priority: 'NORMAL' as const,
    special_instructions: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, priorityFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchTerm) filters.customer_name = searchTerm;

      const response = await deliveryOrderApi.getOrders(filters);
      setOrders(response);
    } catch (error) {
      console.error('Failed to fetch delivery orders:', error);
      toast.error('Failed to fetch delivery orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, status: string) => {
    try {
      await deliveryOrderApi.updateOrderStatus(orderId, status, 1); // TODO: Get from auth context
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const filteredOrders = orders.filter(order =>
    (statusFilter === 'all' || order.order_status === statusFilter) &&
    (priorityFilter === 'all' || order.priority === priorityFilter) &&
    (order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     order.order_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = ORDER_PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'gray';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-800';
      case 'LOADED': return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadFormData = async () => {
    try {
      const [customersData, locationsData, rateContractsData, cylinderTypesData] = await Promise.all([
        customerApi.getAllCustomers(),
        locationApi.getAllLocations(),
        rateContractApi.getAllRateContracts(),
        cylinderTypeApi.getAllCylinderTypes()
      ]);

      setCustomers(customersData);
      setLocations(locationsData);
      setRateContracts(rateContractsData);
      setCylinderTypes(cylinderTypesData);
      setOrderLines([]);
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const addOrderLine = () => {
    const selectedContract = rateContracts.find(rc => rc.rate_contract_id === formData.rate_contract_id);
    if (!selectedContract) {
      toast.error('Please select a customer first to auto-select a rate contract');
      return;
    }

    setOrderLines([...orderLines, {
      cylinder_type_id: 0,
      ordered_qty: 1,
      rate_applied: 0,
      cylinder_description: ''
    }]);
  };

  const removeOrderLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const updateOrderLine = (index: number, field: keyof CreateDeliveryOrderLineRequest, value: any) => {
    const updatedLines = [...orderLines];
    if (field === 'cylinder_type_id') {
      const selectedCylinder = cylinderTypes.find(ct => ct.CylinderTypeId === Number(value));
      const selectedContract = rateContracts.find(rc => rc.rate_contract_id === formData.rate_contract_id);
      const rate = selectedContract?.rates.find(r => r.cylinder_type_id === Number(value))?.rate_per_cylinder || 0;

      updatedLines[index] = {
        ...updatedLines[index],
        cylinder_type_id: Number(value),
        cylinder_description: selectedCylinder?.Capacity || '',
        rate_applied: rate
      };
    } else {
      updatedLines[index] = { ...updatedLines[index], [field]: value };
    }
    setOrderLines(updatedLines);
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now();
    return `ORD-${timestamp}`;
  };

  const handleCreateOrder = async () => {
    try {
      if (!formData.customer_id || !formData.location_id || !formData.rate_contract_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (orderLines.length === 0) {
        toast.error('Please add at least one cylinder type');
        return;
      }

      const orderData: CreateDeliveryOrderRequest = {
        order_number: formData.order_number || generateOrderNumber(),
        customer_id: formData.customer_id,
        location_id: formData.location_id,
        rate_contract_id: formData.rate_contract_id,
        order_date: formData.order_date,
        requested_delivery_date: formData.requested_delivery_date,
        requested_delivery_time: formData.requested_delivery_time && formData.requested_delivery_time.trim() !== '' ? `${formData.requested_delivery_time}:00` : undefined,
        priority: formData.priority,
        special_instructions: formData.special_instructions || undefined,
        created_by: 1, // TODO: Get from auth context
        lines: orderLines
      };

      console.log('FRONTEND DEBUG: Sending order data:', JSON.stringify(orderData, null, 2));
      console.log('FRONTEND DEBUG: requested_delivery_time value:', orderData.requested_delivery_time, typeof orderData.requested_delivery_time);

      await deliveryOrderApi.createOrder(orderData);
      toast.success('Order created successfully!');
      setShowCreateOrder(false);
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error('Failed to create order');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Orders</h1>
          <p className="text-gray-600">Manage advance delivery orders and track their status</p>
        </div>
        <button
          onClick={() => {
            setShowCreateOrder(true);
            loadFormData();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
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
            <option value="all">All Status</option>
            {ORDER_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            {ORDER_PRIORITIES.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.location_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(order.priority)}`}>
                        {ORDER_PRIORITIES.find(p => p.value === order.priority)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(order.order_status)}`}>
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
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={order.order_status}
                          onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          {ORDER_STATUSES.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Order Details - {selectedOrder.order_number}</h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Order Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Customer:</span>
                      <span>{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Location:</span>
                      <span>{selectedOrder.location_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Priority:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(selectedOrder.priority)}`}>
                        {ORDER_PRIORITIES.find(p => p.value === selectedOrder.priority)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(selectedOrder.order_status)}`}>
                        {ORDER_STATUSES.find(s => s.value === selectedOrder.order_status)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Requested Date:</span>
                      <span>{new Date(selectedOrder.requested_delivery_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Order Date:</span>
                      <span>{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Quantities</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Ordered:</span>
                      <span>{selectedOrder.total_ordered_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Planned:</span>
                      <span>{selectedOrder.total_planned_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Loaded:</span>
                      <span>{selectedOrder.total_loaded_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Delivered:</span>
                      <span>{selectedOrder.total_delivered_qty}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.special_instructions && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.special_instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Delivery Order</h2>
                <button
                  onClick={() => setShowCreateOrder(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateOrder(); }} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => {
                        const customerId = Number(e.target.value);
                        // Auto-select rate contract for this customer
                        const customerContract = rateContracts.find(rc =>
                          rc.customer_id === customerId && rc.is_active
                        );
                        setFormData({
                          ...formData,
                          customer_id: customerId,
                          rate_contract_id: customerContract?.rate_contract_id || 0
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.CustomerId} value={customer.CustomerId}>
                          {customer.CustomerName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({...formData, location_id: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select Location</option>
                      {locations.map(location => (
                        <option key={location.LocationId} value={location.LocationId}>
                          {location.LocationName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Contract</label>
                    <select
                      value={formData.rate_contract_id}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    >
                      <option value={0}>
                        {formData.rate_contract_id ?
                          rateContracts.find(rc => rc.rate_contract_id === formData.rate_contract_id)?.contract_name :
                          'Select customer first'
                        }
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Auto-selected based on customer</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                    <input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requested Delivery Date</label>
                    <input
                      type="date"
                      value={formData.requested_delivery_date}
                      onChange={(e) => setFormData({...formData, requested_delivery_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ORDER_PRIORITIES.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special delivery instructions..."
                  />
                </div>

                {/* Order Lines */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Cylinder Requirements</h3>
                    <button
                      type="button"
                      onClick={addOrderLine}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Cylinder
                    </button>
                  </div>

                  {orderLines.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No cylinders added yet. Click "Add Cylinder" to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderLines.map((line, index) => (
                        <div key={index} className="flex gap-4 items-center p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <select
                              value={line.cylinder_type_id}
                              onChange={(e) => updateOrderLine(index, 'cylinder_type_id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={0}>Select Cylinder Type</option>
                              {cylinderTypes.map(cylinder => (
                                <option key={cylinder.CylinderTypeId} value={cylinder.CylinderTypeId}>
                                  {cylinder.Capacity}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={line.ordered_qty}
                              onChange={(e) => updateOrderLine(index, 'ordered_qty', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              placeholder="Rate"
                              value={line.rate_applied}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div className="w-32 text-right font-medium">
                            ₹{(line.ordered_qty * line.rate_applied).toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOrderLine(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Summary */}
                  {orderLines.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Quantity:</span>
                        <span className="text-lg font-bold">{orderLines.reduce((sum, line) => sum + line.ordered_qty, 0)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{orderLines.reduce((sum, line) => sum + (line.ordered_qty * line.rate_applied), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrder(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
