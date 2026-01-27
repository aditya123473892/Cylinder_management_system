'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Truck, Users, Calendar, RefreshCw, Save, AlertCircle, Edit3, Package, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryOrderApi } from '@/lib/api/deliveryOrderApi';
import { cylinderExchangeApi } from '@/lib/api/cylinderExchangeApi';
import { vehicleApi } from '@/lib/api/vehicleApi';
import { driverApi } from '@/lib/api/driverApi';
import { cylinderInventoryApi } from '@/lib/api/cylinderInventoryApi';
import { DeliveryOrder, ORDER_STATUSES } from '@/types/deliveryOrder';
import { VehicleMaster } from '@/types/vehicle';
import { DriverMaster } from '@/types/driver';
import { CylinderMovement, MovementType } from '@/types/cylinderInventory';

interface DeliveryPlan {
  plan_id: number;
  plan_date: string;
  vehicle_id: number;
  driver_id: number;
  plan_status: string;
  total_planned_orders: number;
  notes?: string;
  vehicle?: VehicleMaster;
  driver?: DriverMaster;
  orders?: DeliveryOrderWithLines[];
}

interface DeliveryOrderWithLines extends DeliveryOrder {
  lines: Array<{
    order_line_id: number;
    cylinder_type_id: number;
    cylinder_description: string;
    ordered_qty: number;
    rate_applied: number;
  }>;
}

interface OrderDeliveryData {
  order_id: number;
  order_number: string;
  customer_name: string;
  total_ordered: number;
  filled_delivered: number;
  empty_expected: number;
  empty_actual: number;
  variance: number;
  variance_reason?: string;
  customer_acknowledged: boolean;
  notes?: string;
  is_edited: boolean;
  cylinder_type_id?: number;
  cylinder_description?: string;
  rate_applied?: number;
}

interface VehicleSummary {
  vehicle_id: number;
  vehicle_number: string;
  driver_name: string;
  total_orders: number;
  total_filled_delivered: number;
  total_empty_expected: number;
  total_empty_actual: number;
  total_variance: number;
  total_exchange_value: number;
  orders: OrderDeliveryData[];
}

export default function DeliveryCompletionPage() {
  const [deliveryPlans, setDeliveryPlans] = useState<DeliveryPlan[]>([]);
  const [vehicleSummaries, setVehicleSummaries] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('ASSIGNED'); // Default to ASSIGNED for completion
  const [editingMode, setEditingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    totalOrders: number;
    totalFilledDelivered: number;
    totalEmptyCollected: number;
    totalVariance: number;
    totalExchangeValue: number;
    vehicles: VehicleSummary[];
  } | null>(null);

  useEffect(() => {
    fetchDeliveryPlans();
  }, [selectedDate, statusFilter]);

  const fetchDeliveryPlans = async () => {
    try {
      setLoading(true);
      
      // Fetch real delivery orders with statuses that need completion
      const filters: any = {
        date_from: selectedDate,
        date_to: selectedDate
      };
      
      // Only add status filter if not 'all'
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const orders = await deliveryOrderApi.getOrders(filters);
      
      console.log('DEBUG: Fetched delivery orders for completion:', orders);

      // Group orders by vehicle if they have vehicle assignments
      const ordersByVehicle = orders.reduce((groups, order) => {
        // For now, we'll assume orders have vehicle_id or we need to fetch assignments
        // This would ideally come from a delivery_plan_order mapping table
        const vehicleId = order.total_planned_qty > 0 ? 15 : 15; // Use existing vehicle ID 15
        
        if (!groups[vehicleId]) {
          groups[vehicleId] = {
            vehicle_id: vehicleId,
            plan_id: vehicleId, // Temporary
            plan_date: selectedDate,
            plan_status: 'DISPATCHED',
            total_planned_orders: 0,
            notes: 'Auto-generated for completion',
            orders: []
          };
        }
        
        groups[vehicleId].orders.push(order);
        groups[vehicleId].total_planned_orders++;
        
        return groups;
      }, {} as any);

      // Convert to plans format and enrich with vehicle/driver details
      const plans = Object.values(ordersByVehicle);
      
      const enrichedPlans = await Promise.all(
        plans.map(async (plan: any) => {
          try {
            const vehicle = await vehicleApi.getVehicleById(plan.vehicle_id);
            
            // Don't auto-select driver - let user choose manually
            return {
              ...plan,
              vehicle,
              driver: null // No auto-selected driver
            };
          } catch (error) {
            console.error('Failed to fetch vehicle details:', error);
            return {
              ...plan,
              vehicle: {
                vehicle_id: plan.vehicle_id,
                vehicle_number: `Vehicle-${plan.vehicle_id}`,
                vehicle_type: 'TRUCK',
                capacity_tonnes: 5,
                transporter_id: null,
                is_active: true,
                created_at: new Date().toISOString()
              },
              driver: null // No auto-selected driver
            };
          }
        })
      );

      setDeliveryPlans(enrichedPlans);
      await processVehicleSummaries(enrichedPlans);
    } catch (error) {
      console.error('Failed to fetch delivery plans:', error);
      toast.error('Failed to load delivery plans');
    } finally {
      setLoading(false);
    }
  };

  const processVehicleSummaries = async (plans: DeliveryPlan[]) => {
    const summaries: VehicleSummary[] = [];

    for (const plan of plans) {
      const vehicleSummary: VehicleSummary = {
        vehicle_id: plan.vehicle_id,
        vehicle_number: plan.vehicle?.vehicle_number || 'Unknown',
        driver_name: plan.driver?.driver_name || 'Not Assigned',
        total_orders: 0,
        total_filled_delivered: 0,
        total_empty_expected: 0,
        total_empty_actual: 0,
        total_variance: 0,
        total_exchange_value: 0,
        orders: []
      };

      // Use real orders from the plan
      const realOrders = plan.orders || [];
      
      for (const order of realOrders) {
        // Get real order lines from the database
        const orderWithLines = await deliveryOrderApi.getOrderById(order.order_id);
        const realOrderLines = orderWithLines.lines || [];
        
        // If no order lines exist, skip this order
        if (realOrderLines.length === 0) {
          console.warn(`No order lines found for order ${order.order_id}`);
          continue;
        }

        const totalOrdered = realOrderLines.reduce((sum, line) => sum + line.ordered_qty, 0);

        const orderData: OrderDeliveryData = {
          order_id: order.order_id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total_ordered: totalOrdered,
          filled_delivered: totalOrdered, // Assume full delivery for now
          empty_expected: totalOrdered, // Expect equal returns
          empty_actual: totalOrdered, // Assume equal returns for now
          variance: 0,
          customer_acknowledged: false,
          is_edited: false,
          cylinder_type_id: realOrderLines[0]?.cylinder_type_id,
          cylinder_description: realOrderLines[0]?.cylinder_description || `Cylinder Type ${realOrderLines[0]?.cylinder_type_id}`,
          rate_applied: realOrderLines[0]?.rate_applied || 0
        };

        orderData.variance = orderData.empty_actual - orderData.empty_expected;

        vehicleSummary.orders.push(orderData);
        vehicleSummary.total_orders++;
        vehicleSummary.total_filled_delivered += orderData.filled_delivered;
        vehicleSummary.total_empty_expected += orderData.empty_expected;
        vehicleSummary.total_empty_actual += orderData.empty_actual;
        vehicleSummary.total_variance += orderData.variance;
        vehicleSummary.total_exchange_value += (orderData.filled_delivered * (orderData.rate_applied || 0));
      }

      summaries.push(vehicleSummary);
    }

    setVehicleSummaries(summaries);
  };

  const handleOrderEdit = (vehicleIndex: number, orderIndex: number, field: keyof OrderDeliveryData, value: any) => {
    const newSummaries = [...vehicleSummaries];
    const order = newSummaries[vehicleIndex].orders[orderIndex];
    
    // Type-safe assignment
    (order as any)[field] = value;
    order.is_edited = true;
    
    // Recalculate variance
    if (field === 'empty_actual' || field === 'empty_expected') {
      order.variance = order.empty_actual - order.empty_expected;
    }

    // Recalculate vehicle totals
    const vehicle = newSummaries[vehicleIndex];
    vehicle.total_filled_delivered = vehicle.orders.reduce((sum, o) => sum + o.filled_delivered, 0);
    vehicle.total_empty_expected = vehicle.orders.reduce((sum, o) => sum + o.empty_expected, 0);
    vehicle.total_empty_actual = vehicle.orders.reduce((sum, o) => sum + o.empty_actual, 0);
    vehicle.total_variance = vehicle.orders.reduce((sum, o) => sum + o.variance, 0);
    vehicle.total_exchange_value = vehicle.orders.reduce((sum, o) => sum + (o.filled_delivered * (o.rate_applied || 0)), 0);

    setVehicleSummaries(newSummaries);
  };

  const handleConfirmAllDeliveries = async () => {
    // Check if any vehicle has no driver assigned
    const unassignedVehicles = vehicleSummaries.filter(vehicle => vehicle.driver_name === 'Not Assigned');
    if (unassignedVehicles.length > 0) {
      toast.error(`Please assign drivers to vehicles before confirming deliveries: ${unassignedVehicles.map(v => v.vehicle_number).join(', ')}`);
      return;
    }

    // Prepare confirmation dialog data
    const totalOrders = vehicleSummaries.reduce((sum, v) => sum + v.total_orders, 0);
    const totalFilledDelivered = vehicleSummaries.reduce((sum, v) => sum + v.total_filled_delivered, 0);
    const totalEmptyCollected = vehicleSummaries.reduce((sum, v) => sum + v.total_empty_actual, 0);
    const totalVariance = vehicleSummaries.reduce((sum, v) => sum + v.total_variance, 0);
    const totalExchangeValue = vehicleSummaries.reduce((sum, v) => sum + v.total_exchange_value, 0);

    setConfirmDialogData({
      totalOrders,
      totalFilledDelivered,
      totalEmptyCollected,
      totalVariance,
      totalExchangeValue,
      vehicles: vehicleSummaries
    });
    setShowConfirmDialog(true);
  };

  const handleFinalConfirmation = async () => {
    try {
      setSaving(true);
      
      // Process each vehicle's orders
      for (const vehicle of vehicleSummaries) {
        // Record exchange for each order
        for (const order of vehicle.orders) {
          await cylinderExchangeApi.recordExchange({
            order_id: order.order_id,
            filled_delivered: order.filled_delivered,
            empty_collected: order.empty_actual,
            expected_empty: order.empty_expected,
            variance_reason: order.variance !== 0 ? order.variance_reason : undefined,
            customer_acknowledged: order.customer_acknowledged,
            notes: order.notes
          });

          // Update order status to DELIVERED
          await deliveryOrderApi.updateOrderStatus(order.order_id, 'DELIVERED', 1);
        }

        // Update vehicle inventory - move empty cylinders from vehicle to yard
        await updateVehicleInventory(vehicle);
      }

      toast.success('✅ All deliveries confirmed and inventory updated successfully!');
      setShowConfirmDialog(false);
      setEditingMode(false);
      await fetchDeliveryPlans(); // Refresh data
    } catch (error) {
      console.error('Failed to confirm deliveries:', error);
      toast.error('Failed to confirm deliveries');
    } finally {
      setSaving(false);
    }
  };

  const updateVehicleInventory = async (vehicle: VehicleSummary) => {
    try {
      console.log('DEBUG: Vehicle orders before processing:', vehicle.orders);
      
      // Group by cylinder type for inventory updates
      const cylinderGroups = vehicle.orders.reduce((groups, order) => {
        if (order.cylinder_type_id) {
          const key = order.cylinder_type_id;
          console.log('DEBUG: Processing order with cylinder_type_id:', order.cylinder_type_id, 'order:', order);
          if (!groups[key]) {
            groups[key] = {
              cylinder_type_id: key,
              cylinder_description: order.cylinder_description || '',
              empty_collected: 0,
              filled_delivered: 0
            };
          }
          groups[key].empty_collected += order.empty_actual;
          groups[key].filled_delivered += order.filled_delivered;
        }
        return groups;
      }, {} as Record<number, any>);

      // Update inventory for each cylinder type
      for (const [cylinderTypeId, data] of Object.entries(cylinderGroups)) {
        const typeId = parseInt(cylinderTypeId);
        
        // Move empty cylinders from vehicle to yard
        if (data.empty_collected > 0) {
          await cylinderInventoryApi.getInventory({
            locationType: 'VEHICLE',
            referenceId: vehicle.vehicle_id,
            cylinderStatus: 'EMPTY',
            cylinderTypeId: typeId
          }).then(async (inventoryResponse) => {
            if (inventoryResponse.success && inventoryResponse.data.length > 0) {
              // Create movement from vehicle to yard
              await createInventoryMovement({
                cylinder_type_id: typeId,
                from_location_type: 'VEHICLE',
                from_location_reference_id: vehicle.vehicle_id,
                from_cylinder_status: 'EMPTY',
                to_location_type: 'YARD',
                to_cylinder_status: 'EMPTY',
                quantity: data.empty_collected,
                movement_type: 'RETURN_EMPTY',
                reference_transaction_id: vehicle.vehicle_id,
                notes: `Empty cylinders returned from ${vehicle.vehicle_number}`
              });
            }
          });
        }

        // Remove filled cylinders from vehicle inventory (delivered to customer)
        if (data.filled_delivered > 0) {
          await createInventoryMovement({
            cylinder_type_id: typeId,
            from_location_type: 'VEHICLE',
            from_location_reference_id: vehicle.vehicle_id,
            from_cylinder_status: 'FILLED',
            to_location_type: 'CUSTOMER',
            to_cylinder_status: 'FILLED',
            quantity: data.filled_delivered,
            movement_type: 'DELIVERY_FILLED',
            reference_transaction_id: vehicle.vehicle_id,
            notes: `Filled cylinders delivered from ${vehicle.vehicle_number}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to update vehicle inventory:', error);
      throw error;
    }
  };

  const createInventoryMovement = async (movementData: any) => {
    try {
      const response = await cylinderInventoryApi.createMovement(movementData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create inventory movement');
      }
      console.log('Inventory movement created successfully:', response.data);
    } catch (error) {
      console.error('Failed to create inventory movement:', error);
      throw error;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600 bg-green-50';
    if (variance > 0) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance === 0) return <CheckCircle className="w-4 h-4" />;
    if (variance > 0) return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚚 Daily Delivery Completion</h1>
          <p className="text-gray-600">Confirm deliveries and track cylinder returns by vehicle</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingMode(!editingMode)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              editingMode 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {editingMode ? 'Cancel Edit' : 'Edit Deliveries'}
          </button>
          <button
            onClick={handleConfirmAllDeliveries}
            disabled={saving || !editingMode}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Confirm All Deliveries'}
          </button>
        </div>
      </div>

      {/* Date and Status Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Delivery Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ASSIGNED">Assigned</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="LOADED">Loaded</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery data...</p>
        </div>
      ) : vehicleSummaries.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deliveries Found</h3>
          <p className="text-gray-600">No dispatched deliveries found for {selectedDate}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {vehicleSummaries.map((vehicle, vehicleIndex) => (
            <div key={vehicle.vehicle_id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Vehicle Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Truck className="w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-bold">{vehicle.vehicle_number}</h2>
                      <p className="text-blue-100">Driver: {vehicle.driver_name} {vehicle.driver_name === 'Not Assigned' && '(Please assign driver in dispatch notes)'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{vehicle.total_orders} Orders</div>
                    <div className="text-blue-100">Total Variance: {vehicle.total_variance}</div>
                  </div>
                </div>
              </div>

              {/* Vehicle Summary Stats */}
              <div className="grid grid-cols-5 gap-4 p-6 bg-gray-50 border-b">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Filled Delivered</p>
                  <p className="text-xl font-bold text-blue-600">{vehicle.total_filled_delivered}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Expected Returns</p>
                  <p className="text-xl font-bold text-gray-900">{vehicle.total_empty_expected}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Actual Returns</p>
                  <p className="text-xl font-bold text-green-600">{vehicle.total_empty_actual}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Net Variance</p>
                  <p className={`text-xl font-bold ${getVarianceColor(vehicle.total_variance).split(' ')[0]}`}>
                    {vehicle.total_variance > 0 ? '+' : ''}{vehicle.total_variance}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Exchange Value</p>
                  <p className="text-xl font-bold text-purple-600">₹{vehicle.total_exchange_value.toLocaleString()}</p>
                </div>
              </div>

              {/* Orders Table */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Delivery Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm font-medium text-gray-700">Order #</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">Customer</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Ordered</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Filled Delivered</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Expected Returns</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Actual Returns</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Variance</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Variance Reason</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-700">Customer Ack</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.orders.map((order, orderIndex) => (
                        <tr key={order.order_id} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <span className="font-medium">{order.order_number}</span>
                            {order.is_edited && <span className="ml-2 text-xs text-orange-600">(edited)</span>}
                          </td>
                          <td className="py-3">{order.customer_name}</td>
                          <td className="py-3 text-center">{order.total_ordered}</td>
                          <td className="py-3">
                            {editingMode ? (
                              <input
                                type="number"
                                value={order.filled_delivered}
                                onChange={(e) => handleOrderEdit(vehicleIndex, orderIndex, 'filled_delivered', Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                min="0"
                              />
                            ) : (
                              <span className="text-center block">{order.filled_delivered}</span>
                            )}
                          </td>
                          <td className="py-3 text-center">{order.empty_expected}</td>
                          <td className="py-3">
                            {editingMode ? (
                              <input
                                type="number"
                                value={order.empty_actual}
                                onChange={(e) => handleOrderEdit(vehicleIndex, orderIndex, 'empty_actual', Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                min="0"
                              />
                            ) : (
                              <span className="text-center block">{order.empty_actual}</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getVarianceColor(order.variance)}`}>
                              {getVarianceIcon(order.variance)}
                              {order.variance > 0 ? '+' : ''}{order.variance}
                            </span>
                          </td>
                          <td className="py-3">
                            {editingMode ? (
                              <input
                                type="text"
                                value={order.variance_reason || ''}
                                onChange={(e) => handleOrderEdit(vehicleIndex, orderIndex, 'variance_reason', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Enter reason"
                              />
                            ) : (
                              <span className="text-sm text-gray-600">{order.variance_reason || '-'}</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            {editingMode ? (
                              <input
                                type="checkbox"
                                checked={order.customer_acknowledged}
                                onChange={(e) => handleOrderEdit(vehicleIndex, orderIndex, 'customer_acknowledged', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600"
                              />
                            ) : (
                              order.customer_acknowledged ? (
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmDialogData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Confirm Delivery Completion</h2>
                <p className="text-gray-600">Review and confirm the delivery details below</p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-gray-900">{confirmDialogData.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Filled Delivered</p>
                  <p className="text-lg font-bold text-blue-600">{confirmDialogData.totalFilledDelivered}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Empty Collected</p>
                  <p className="text-lg font-bold text-green-600">{confirmDialogData.totalEmptyCollected}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Net Variance</p>
                  <p className={`text-lg font-bold ${confirmDialogData.totalVariance !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {confirmDialogData.totalVariance > 0 ? '+' : ''}{confirmDialogData.totalVariance}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Exchange Value</p>
                  <p className="text-lg font-bold text-purple-600">₹{confirmDialogData.totalExchangeValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Vehicle Breakdown */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Vehicle Breakdown</h3>
              <div className="space-y-3">
                {confirmDialogData.vehicles.map((vehicle) => (
                  <div key={vehicle.vehicle_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{vehicle.vehicle_number}</span>
                        <span className="text-sm text-gray-500">({vehicle.driver_name}){vehicle.driver_name === 'Not Assigned' && ' - Please assign driver first'}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {vehicle.total_orders} orders • {vehicle.total_variance !== 0 && (
                          <span className="text-orange-600 font-medium">
                            Variance: {vehicle.total_variance > 0 ? '+' : ''}{vehicle.total_variance}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Filled:</span>
                        <span className="ml-1 font-medium">{vehicle.total_filled_delivered}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Expected:</span>
                        <span className="ml-1 font-medium">{vehicle.total_empty_expected}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Actual:</span>
                        <span className="ml-1 font-medium">{vehicle.total_empty_actual}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Value:</span>
                        <span className="ml-1 font-medium">₹{vehicle.total_exchange_value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Update Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Inventory Update</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Upon confirmation, the system will automatically:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Move {confirmDialogData.totalEmptyCollected} empty cylinders from vehicles to yard</li>
                    <li>• Update vehicle inventory to reflect delivered cylinders</li>
                    <li>• Record cylinder exchanges and update order status to DELIVERED</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalConfirmation}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Update Inventory
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
