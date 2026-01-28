'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Truck, MapPin, Calendar, Package, Filter, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryOrderApi } from '@/lib/api/deliveryOrderApi';
import { cylinderExchangeApi } from '@/lib/api/cylinderExchangeApi';
import { cylinderInventoryApi } from '@/lib/api/cylinderInventoryApi';
import { DeliveryOrder, ORDER_STATUSES, ORDER_PRIORITIES } from '@/types/deliveryOrder';
import { OrderExchangeTracking, VARIANCE_REASONS, RecordExchangeRequest } from '@/types/cylinderExchange';

export default function DispatchOrdersPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showExchangeVerification, setShowExchangeVerification] = useState(false);
  const [exchangeVerifications, setExchangeVerifications] = useState<Record<number, OrderExchangeTracking>>({});
  const [exchangeData, setExchangeData] = useState<RecordExchangeRequest>({
    order_id: 0,
    filled_delivered: 0,
    empty_collected: 0,
    expected_empty: 0,
    variance_reason: '',
    customer_acknowledged: false,
    notes: ''
  });
  const [emptyCylinderDestination, setEmptyCylinderDestination] = useState<'YARD' | 'VEHICLE'>('YARD');
  const [showCustomerValidation, setShowCustomerValidation] = useState(false);

  // Dispatch-related statuses
  const dispatchStatuses = ['ASSIGNED', 'LOADED', 'IN_TRANSIT'];

  useEffect(() => {
    fetchDispatchOrders();
    fetchExchangeVerifications();
  }, [statusFilter, priorityFilter]);

  const fetchDispatchOrders = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      // Only fetch dispatch-related orders
      if (statusFilter === 'all') {
        // If no specific status filter, get all dispatch-related statuses
        const promises = dispatchStatuses.map(status => 
          deliveryOrderApi.getOrders({ ...filters, status })
        );
        const responses = await Promise.all(promises);
        const allOrders = responses.flat();
        
        // Remove duplicates and sort by updated date
        const uniqueOrders = allOrders.filter((order, index, self) =>
          index === self.findIndex(o => o.order_id === order.order_id)
        );
        setOrders(uniqueOrders.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ));
      } else {
        // If specific status filter, apply it
        filters.status = statusFilter;
        const response = await deliveryOrderApi.getOrders(filters);
        setOrders(response);
      }

      if (searchTerm) {
        filters.customer_name = searchTerm;
      }
    } catch (error) {
      console.error('Failed to fetch dispatch orders:', error);
      toast.error('Failed to fetch dispatch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeVerifications = async () => {
    try {
      const response = await cylinderExchangeApi.getExchangeTracking();
      const verificationMap: Record<number, OrderExchangeTracking> = {};
      response.forEach(exchange => {
        verificationMap[exchange.order_id] = exchange;
      });
      setExchangeVerifications(verificationMap);
    } catch (error) {
      console.error('Failed to fetch exchange verifications:', error);
    }
  };

  const handleStatusUpdate = async (orderId: number, status: string) => {
    // Check if trying to mark as DELIVERED without exchange verification
    if (status === 'DELIVERED' && !exchangeVerifications[orderId]) {
      toast.error('Exchange verification required before marking order as delivered');
      // Open exchange verification modal
      const order = orders.find(o => o.order_id === orderId);
      if (order) {
        setSelectedOrder(order);
        setExchangeData({
          order_id: orderId,
          filled_delivered: order.total_loaded_qty || order.total_planned_qty || order.total_ordered_qty,
          empty_collected: 0,
          expected_empty: order.total_loaded_qty || order.total_planned_qty || order.total_ordered_qty,
          variance_reason: '',
          customer_acknowledged: false,
          notes: ''
        });
        setShowExchangeVerification(true);
      }
      return;
    }

    try {
      // Update order status
      await deliveryOrderApi.updateOrderStatus(orderId, status, 1); // TODO: Get from auth context
      
      // If marking as delivered, trigger inventory updates based on exchange verification
      if (status === 'DELIVERED' && exchangeVerifications[orderId]) {
        const verification = exchangeVerifications[orderId];
        
        // Fetch order details to get actual cylinder types
        const orderDetails = await deliveryOrderApi.getOrderById(orderId);
        
        // First validate customer cylinders to get the validation results
        const validationResults = await validateCustomerCylinders();
        if (!validationResults) {
          toast.error('Cannot complete delivery - customer cylinder validation failed');
          return;
        }
        
        // Create inventory movement transactions for each cylinder type in the order
        const movementPromises = orderDetails.lines.map(line => {
          const validation = validationResults.find((v: any) => v.cylinder_type_id === line.cylinder_type_id);
          
          // For single cylinder type orders, use empty_collected directly
          // For multi-cylinder type orders, distribute proportionally
          const emptyToReturn = orderDetails.lines.length === 1
            ? verification.empty_collected
            : Math.floor((verification.empty_collected * line.ordered_qty) / verification.expected_empty) || 0;
          
          const movements = [
            // Move filled cylinders from VEHICLE to CUSTOMER
            cylinderInventoryApi.createMovement({
              cylinderTypeId: line.cylinder_type_id,
              fromLocationType: 'VEHICLE',
              fromLocationReferenceId: verification.order_id, // This should be the actual vehicle/plan ID
              toLocationType: 'CUSTOMER', 
              toLocationReferenceId: verification.order_id,
              quantity: line.delivered_qty || line.planned_qty || line.ordered_qty,
              cylinderStatus: 'FILLED',
              movementType: 'DELIVERY_FILLED',
              referenceTransactionId: verification.exchange_id,
              notes: `Delivered ${line.cylinder_description} via order ${verification.order_id}`
            })
          ];
          
          // Handle empty cylinder return with smart status conversion
          if (emptyToReturn > 0 && validation) {
            // First, convert FILLED cylinders to EMPTY if needed
            const filledToConvert = Math.min(emptyToReturn - validation.availableEmpty, validation.availableFilled);
            
            if (filledToConvert > 0) {
              // Convert FILLED to EMPTY cylinders
              movements.push(
                cylinderInventoryApi.createMovement({
                  cylinderTypeId: line.cylinder_type_id,
                  fromLocationType: 'CUSTOMER',
                  fromLocationReferenceId: verification.order_id,
                  toLocationType: 'CUSTOMER',
                  toLocationReferenceId: verification.order_id,
                  quantity: filledToConvert,
                  cylinderStatus: 'EMPTY',
                  movementType: 'CONVERSION',
                  referenceTransactionId: verification.exchange_id,
                  notes: `Converted ${filledToConvert} ${line.cylinder_description} from FILLED to EMPTY for return via order ${verification.order_id}`
                })
              );
            }
            
            // Then move empty cylinders to destination
            movements.push(
              cylinderInventoryApi.createMovement({
                cylinderTypeId: line.cylinder_type_id,
                fromLocationType: 'CUSTOMER',
                fromLocationReferenceId: verification.order_id,
                toLocationType: emptyCylinderDestination,
                toLocationReferenceId: emptyCylinderDestination === 'VEHICLE' ? verification.order_id : undefined,
                quantity: emptyToReturn,
                cylinderStatus: 'EMPTY',
                movementType: 'RETURN_EMPTY',
                referenceTransactionId: verification.exchange_id,
                notes: `Collected ${line.cylinder_description} via order ${verification.order_id} - Stored in ${emptyCylinderDestination}`
              })
            );
          }
          
          return movements;
        }).flat();
        
        await Promise.all(movementPromises);
        
        toast.success('Order delivered and inventory updated successfully!');
      } else {
        toast.success('Order status updated successfully');
      }
      
      fetchDispatchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const openExchangeVerification = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setExchangeData({
      order_id: order.order_id,
      filled_delivered: order.total_loaded_qty || order.total_planned_qty || order.total_ordered_qty,
      empty_collected: 0,
      expected_empty: order.total_loaded_qty || order.total_planned_qty || order.total_ordered_qty,
      variance_reason: '',
      customer_acknowledged: false,
      notes: ''
    });
    setEmptyCylinderDestination('YARD');
    setShowCustomerValidation(false);
    setShowExchangeVerification(true);
  };

  const validateCustomerCylinders = async () => {
    if (!selectedOrder) return false;
    
    try {
      // Get order details to check cylinder types
      const orderDetails = await deliveryOrderApi.getOrderById(selectedOrder.order_id);
      
      // Find the correct customer reference ID by checking all customer inventory
      let actualCustomerReferenceId = selectedOrder.customer_id;
      
      try {
        const allCustomersInventory = await cylinderInventoryApi.getInventory({
          locationType: 'CUSTOMER'
        });
        
        // Check for data inconsistency and show fix if needed
        if (allCustomersInventory.data && allCustomersInventory.data.length > 0) {
          const actualCustomerData = allCustomersInventory.data[0];
          
          // Handle case where inventory is stored with null reference ID (general customer inventory)
          if (actualCustomerData.locationReferenceId === null || actualCustomerData.locationReferenceId === undefined) {
            // This is valid - customer inventory is stored without specific reference ID
            // Use the order's customer ID for the operations
            actualCustomerReferenceId = selectedOrder.customer_id;
          } else {
            // Check for ID mismatch when reference ID exists
            const hasIdMismatch = actualCustomerData.locationReferenceId !== selectedOrder.customer_id;
            const hasNameMismatch = actualCustomerData.locationReferenceName !== selectedOrder.customer_name;
            
            if (hasIdMismatch || hasNameMismatch) {
              // Show data integrity issue and provide fix
              toast.error(`Data integrity issue! Order customer ID (${selectedOrder.customer_id}) doesn't match inventory reference ID (${actualCustomerData.locationReferenceId}). Please run: UPDATE DELIVERY_ORDER SET customer_id = ${actualCustomerData.locationReferenceId}, customer_name = '${actualCustomerData.locationReferenceName}' WHERE order_id = ${selectedOrder.order_id};`, { duration: 10000 });
              return false;
            }
            
            // Use the verified customer ID
            actualCustomerReferenceId = actualCustomerData.locationReferenceId!;
          }
        }
        
      } catch (error) {
        console.error('Error fetching customer inventory:', error);
      }
      
      // Check if customer has enough cylinders to return (either EMPTY or FILLED)
      const validationPromises = orderDetails.lines.map(async (line) => {
        // Use the same approach as the inventory page - getInventory with filters
        let availableEmpty = 0, availableFilled = 0;
        
        try {
          // First try with specific customer reference ID
          const customerInventory = await cylinderInventoryApi.getInventory({
            locationType: 'CUSTOMER',
            referenceId: actualCustomerReferenceId
          });
          
          // If no results with specific reference ID, try without reference ID (for general customer inventory)
          let inventoryToUse = customerInventory.data;
          if (!customerInventory.data || customerInventory.data.length === 0) {
            const allCustomerInventory = await cylinderInventoryApi.getInventory({
              locationType: 'CUSTOMER'
            });
            inventoryToUse = allCustomerInventory.data;
          }
          
          // Filter for this specific cylinder type and status
          const emptyItems = inventoryToUse?.filter(item => 
            item.cylinderTypeId === line.cylinder_type_id && 
            item.cylinderStatus === 'EMPTY'
          );
          
          const filledItems = inventoryToUse?.filter(item => 
            item.cylinderTypeId === line.cylinder_type_id && 
            item.cylinderStatus === 'FILLED'
          );
          
          // Sum up quantities
          availableEmpty = emptyItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          availableFilled = filledItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          
        } catch (error) {
          console.error('Error fetching customer inventory:', error);
          // Fallback to getAvailableQuantity if getInventory fails
          try {
            const emptyResponse = await cylinderInventoryApi.getAvailableQuantity(
              line.cylinder_type_id, 'CUSTOMER', actualCustomerReferenceId, 'EMPTY'
            );
            availableEmpty = emptyResponse.data.quantity;
          } catch {}
          
          try {
            const filledResponse = await cylinderInventoryApi.getAvailableQuantity(
              line.cylinder_type_id, 'CUSTOMER', actualCustomerReferenceId, 'FILLED'
            );
            availableFilled = filledResponse.data.quantity;
          } catch {}
        }
        
        // For single cylinder type orders, use empty_collected directly
// For multi-cylinder type orders, distribute proportionally
        const expectedEmpty = orderDetails.lines.length === 1 
          ? exchangeData.empty_collected
          : Math.floor((exchangeData.empty_collected * line.ordered_qty) / exchangeData.expected_empty);
        
        console.log('=== CALCULATION DEBUG ===');
        console.log('Exchange Data:', exchangeData);
        console.log('Line ordered_qty:', line.ordered_qty);
        console.log('Number of cylinder types:', orderDetails.lines.length);
        console.log('Single cylinder type order:', orderDetails.lines.length === 1);
        console.log('Calculation:', orderDetails.lines.length === 1 ? 'empty_collected (single type)' : '(empty_collected * ordered_qty) / expected_empty');
        console.log(`Result: ${expectedEmpty}`);
        
        // Customer can return if they have enough EMPTY or FILLED cylinders
        const totalAvailableForReturn = availableEmpty + availableFilled;
        const canReturn = totalAvailableForReturn >= expectedEmpty;
        
        console.log('Available:', totalAvailableForReturn, 'Expected:', expectedEmpty, 'Can return:', canReturn);
        
        return {
          cylinder_type_id: line.cylinder_type_id,
          cylinder_description: line.cylinder_description,
          availableEmpty: availableEmpty,
          availableFilled: availableFilled,
          totalAvailable: totalAvailableForReturn,
          expected: expectedEmpty,
          canReturn,
          actualReferenceId: actualCustomerReferenceId
        };
      });
      
      const validations = await Promise.all(validationPromises);
      
      const hasShortage = validations.some(v => !v.canReturn);
      
      if (hasShortage) {
        const shortageDetails = validations
          .filter(v => !v.canReturn)
          .map(v => `${v.cylinder_description}: Need ${v.expected}, Have ${v.totalAvailable}`)
          .join(', ');
        
        toast.error(`Customer doesn't have enough cylinders to return. ${shortageDetails}`);
        return false;
      }
      
      toast.success('Customer has sufficient cylinders for return!');
      return validations; // Return validation results for inventory movements
    } catch (error) {
      console.error('Error validating customer cylinders:', error);
      toast.error('Failed to validate customer cylinder availability');
      return false;
    }
  };

  const handleExchangeVerification = async () => {
    if (!exchangeData.order_id) {
      toast.error('Order ID is required');
      return;
    }

    // Validate customer has enough cylinders to return
    if (exchangeData.empty_collected > 0) {
      const isValid = await validateCustomerCylinders();
      if (!isValid) return;
    }

    try {
      // Record the exchange verification with destination info
      const enhancedExchangeData = {
        ...exchangeData,
        notes: `${exchangeData.notes || ''} | Empty cylinders to be stored in: ${emptyCylinderDestination}`
      };

      // Record the exchange verification
      await cylinderExchangeApi.recordExchange(enhancedExchangeData);
      
      // Update the exchange verifications state
      const newVerification: OrderExchangeTracking = {
        exchange_id: Date.now(), // Temporary ID, will be replaced by server response
        order_id: exchangeData.order_id,
        filled_delivered: exchangeData.filled_delivered,
        empty_collected: exchangeData.empty_collected,
        expected_empty: exchangeData.expected_empty,
        variance_qty: exchangeData.empty_collected - exchangeData.expected_empty,
        variance_type: exchangeData.empty_collected < exchangeData.expected_empty ? 'SHORTAGE' : 
                     exchangeData.empty_collected > exchangeData.expected_empty ? 'EXCESS' : 'MATCH',
        variance_reason: exchangeData.variance_reason,
        customer_acknowledged: exchangeData.customer_acknowledged,
        acknowledged_by: exchangeData.customer_acknowledged ? 1 : undefined, // TODO: Get from auth context
        acknowledged_at: exchangeData.customer_acknowledged ? new Date().toISOString() : undefined,
        notes: enhancedExchangeData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExchangeVerifications(prev => ({
        ...prev,
        [exchangeData.order_id]: newVerification
      }));

      toast.success('Exchange verification completed successfully!');
      setShowExchangeVerification(false);
      
      // Now allow marking as delivered
      if (selectedOrder) {
        await handleStatusUpdate(selectedOrder.order_id, 'DELIVERED');
      }
    } catch (error) {
      console.error('Failed to record exchange verification:', error);
      toast.error('Failed to record exchange verification');
    }
  };

  const filteredOrders = orders.filter(order =>
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
      case 'ASSIGNED': return 'bg-purple-100 text-purple-800';
      case 'LOADED': return 'bg-indigo-100 text-indigo-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
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

  const getDispatchProgress = (order: DeliveryOrder) => {
    const statusIndex = dispatchStatuses.indexOf(order.order_status);
    if (statusIndex === -1) return 0;
    return ((statusIndex + 1) / dispatchStatuses.length) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            Dispatch Orders
          </h1>
          <p className="text-gray-600">View and manage orders currently in dispatch process</p>
        </div>
        <button
          onClick={fetchDispatchOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Dispatch Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dispatchStatuses.map(status => {
          const statusConfig = ORDER_STATUSES.find(s => s.value === status);
          const count = orders.filter(o => o.order_status === status).length;
          return (
            <div key={status} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{statusConfig?.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusBadgeClass(status)}`}>
                  <Truck className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
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
            <option value="all">All Dispatch Status</option>
            {dispatchStatuses.map(status => {
              const statusConfig = ORDER_STATUSES.find(s => s.value === status);
              return (
                <option key={status} value={status}>
                  {statusConfig?.label}
                </option>
              );
            })}
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
          <h2 className="text-lg font-semibold">Dispatch Orders ({filteredOrders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">Loading dispatch orders...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${getDispatchProgress(order)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{Math.round(getDispatchProgress(order))}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {order.total_loaded_qty || order.total_planned_qty || order.total_ordered_qty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {exchangeVerifications[order.order_id] ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-800 font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs text-yellow-800 font-medium">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.updated_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!exchangeVerifications[order.order_id] && (
                          <button
                            onClick={() => openExchangeVerification(order)}
                            className="text-green-600 hover:text-green-900"
                            title="Verify Exchange"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <select
                          value={order.order_status}
                          onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          title="Update Status"
                        >
                          {dispatchStatuses.map(status => {
                            const statusConfig = ORDER_STATUSES.find(s => s.value === status);
                            return (
                              <option key={status} value={status}>
                                {statusConfig?.label}
                              </option>
                            );
                          })}
                          <option value="DELIVERED" disabled={!exchangeVerifications[order.order_id]}>
                            Delivered {exchangeVerifications[order.order_id] ? '' : '(Verify First)'}
                          </option>
                          <option value="CANCELLED">Cancelled</option>
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
                <h2 className="text-xl font-bold">Dispatch Order Details - {selectedOrder.order_number}</h2>
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
                  <h3 className="font-semibold mb-4">Dispatch Progress</h3>
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
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{Math.round(getDispatchProgress(selectedOrder))}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full" 
                          style={{ width: `${getDispatchProgress(selectedOrder)}%` }}
                        ></div>
                      </div>
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

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Dispatch Timeline</h3>
                <div className="space-y-2">
                  {dispatchStatuses.map((status, index) => {
                    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
                    const isActive = dispatchStatuses.indexOf(selectedOrder.order_status) >= index;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        <span className={`text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                          {statusConfig?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Verification Modal */}
      {showExchangeVerification && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Cylinder Exchange Verification</h2>
                <button
                  onClick={() => setShowExchangeVerification(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Order Number:</span> {selectedOrder.order_number}
                  </div>
                  <div>
                    <span className="font-medium">Customer:</span> {selectedOrder.customer_name}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {selectedOrder.location_name}
                  </div>
                  <div>
                    <span className="font-medium">Expected Quantity:</span> {selectedOrder.total_loaded_qty || selectedOrder.total_planned_qty || selectedOrder.total_ordered_qty}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filled Cylinders Delivered</label>
                    <input
                      type="number"
                      value={exchangeData.filled_delivered}
                      onChange={(e) => setExchangeData({...exchangeData, filled_delivered: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empty Cylinders Collected</label>
                    <input
                      type="number"
                      value={exchangeData.empty_collected}
                      onChange={(e) => {
                        console.log('Empty collected input changed:', e.target.value);
                        const newValue = Number(e.target.value);
                        console.log('Setting empty_collected to:', newValue);
                        setExchangeData({...exchangeData, empty_collected: newValue});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Empty Cylinders</label>
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
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={exchangeData.empty_collected - exchangeData.expected_empty}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <span className={`text-sm font-medium ${
                        (exchangeData.empty_collected - exchangeData.expected_empty) < 0 ? 'text-red-600' :
                        (exchangeData.empty_collected - exchangeData.expected_empty) > 0 ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {(exchangeData.empty_collected - exchangeData.expected_empty) < 0 ? 'Shortage' :
                         (exchangeData.empty_collected - exchangeData.expected_empty) > 0 ? 'Excess' :
                         'Match'}
                      </span>
                    </div>
                  </div>
                </div>

                {(exchangeData.empty_collected - exchangeData.expected_empty) !== 0 && (
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
                )}

                {exchangeData.empty_collected > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empty Cylinder Destination</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="YARD"
                          checked={emptyCylinderDestination === 'YARD'}
                          onChange={(e) => setEmptyCylinderDestination(e.target.value as 'YARD' | 'VEHICLE')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Store in Yard</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="VEHICLE"
                          checked={emptyCylinderDestination === 'VEHICLE'}
                          onChange={(e) => setEmptyCylinderDestination(e.target.value as 'YARD' | 'VEHICLE')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Keep in Vehicle</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose where to store the returned empty cylinders
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exchangeData.customer_acknowledged}
                    onChange={(e) => setExchangeData({...exchangeData, customer_acknowledged: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Customer acknowledged the exchange</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={exchangeData.notes}
                    onChange={(e) => setExchangeData({...exchangeData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes about the exchange..."
                  />
                </div>

                {/* Exchange Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Exchange Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Filled Delivered:</span>
                      <span className="font-medium">{exchangeData.filled_delivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Empty Collected:</span>
                      <span className="font-medium">{exchangeData.empty_collected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Empty:</span>
                      <span className="font-medium">{exchangeData.expected_empty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Variance:</span>
                      <span className={`font-medium ${
                        (exchangeData.empty_collected - exchangeData.expected_empty) < 0 ? 'text-red-600' :
                        (exchangeData.empty_collected - exchangeData.expected_empty) > 0 ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {exchangeData.empty_collected - exchangeData.expected_empty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowExchangeVerification(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExchangeVerification}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify & Complete Delivery
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
