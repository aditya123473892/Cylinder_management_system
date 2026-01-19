'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, Building2, Warehouse, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cylinderInventoryApi } from '../../../../lib/api/cylinderInventoryApi';
import { InventoryDashboard, InventoryItem, CylinderMovement, InventorySummary } from '../../../../types/cylinderInventory';
import toast, { Toaster } from 'react-hot-toast';

export default function InventoryPage() {
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary[]>([]);
  const [movements, setMovements] = useState<CylinderMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, inventoryRes, summaryRes, movementsRes] = await Promise.all([
        cylinderInventoryApi.getInventoryDashboard(),
        cylinderInventoryApi.getInventory(),
        cylinderInventoryApi.getInventorySummary(),
        cylinderInventoryApi.getCylinderMovements(undefined, undefined, 20)
      ]);

      setDashboard(dashboardRes.data);
      setInventoryItems(inventoryRes.data);
      setInventorySummary(summaryRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      toast.error('Failed to load inventory data');
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (locationType: string) => {
    switch (locationType.toLowerCase()) {
      case 'yard': return <Warehouse className="w-4 h-4 text-blue-600" />;
      case 'plant': return <Building2 className="w-4 h-4 text-orange-600" />;
      case 'customer': return <Package className="w-4 h-4 text-green-600" />;
      case 'vehicle': return <Truck className="w-4 h-4 text-purple-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        status === 'FILLED'
          ? 'bg-green-100 text-green-800'
          : 'bg-orange-100 text-orange-800'
      }`}>
        {status}
      </span>
    );
  };

  const formatMovementType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading inventory data...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'locations', label: 'By Location' },
    { id: 'types', label: 'By Type' },
    { id: 'movements', label: 'Movements' }
  ];

  return (
    <div className="p-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cylinder Inventory</h1>
          <p className="text-gray-600">Real-time visibility of cylinder locations and status</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Alerts */}
          {dashboard.alerts.length > 0 && (
            <div className="space-y-2">
              {dashboard.alerts.map((alert: any, index: number) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                    }`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        alert.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                      }`}>
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Cylinders</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboard.totalCylinders.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Warehouse className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Yard (Filled)</dt>
                      <dd className="text-lg font-medium text-green-600">{dashboard.byLocation.yard.filled.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Plant (Empty)</dt>
                      <dd className="text-lg font-medium text-orange-600">{dashboard.byLocation.plant.empty.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">With Customers</dt>
                      <dd className="text-lg font-medium text-blue-600">{dashboard.byLocation.customers.total.toLocaleString()}</dd>
                      <dd className="text-xs text-gray-500">
                        {dashboard.byLocation.customers.filled} filled, {dashboard.byLocation.customers.empty} empty
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Breakdown */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Inventory by Location</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dashboard.byLocation).map(([location, data]: [string, any]) => (
                  <div key={location} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getLocationIcon(location)}
                      <span className="font-medium capitalize">{location}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Filled:</span>
                        <span className="font-medium text-green-600">{data.filled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Empty:</span>
                        <span className="font-medium text-orange-600">{data.empty}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Total:</span>
                        <span className="font-medium">{data.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Movements */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Movements</h3>
              <div className="space-y-3">
                {dashboard.recentMovements.slice(0, 5).map((movement: CylinderMovement) => (
                  <div key={movement.movement_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{movement.cylinder_type_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatMovementType(movement.movement_type || '')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{movement.quantity} cylinders</p>
                      <p className="text-sm text-gray-500">
                        {new Date(movement.movement_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* By Location Tab */}
      {activeTab === 'locations' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Inventory by Location</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cylinder Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryItems.map((item: InventoryItem) => (
                    <motion.tr key={item.inventoryId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {getLocationIcon(item.locationType)}
                          <span className="capitalize">{item.locationType.toLowerCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.locationReferenceName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.cylinderTypeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.cylinderStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* By Type Tab */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          {inventorySummary.map((summary: InventorySummary) => (
            <div key={summary.cylinderTypeId} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{summary.cylinderTypeName}</h3>
                <span className="inline-flex px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                  Total: {summary.totalQuantity}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(summary.locations).map(([location, data]: [string, any]) => (
                  <div key={location} className="text-sm border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getLocationIcon(location)}
                      <span className="capitalize font-medium">{location.toLowerCase()}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Filled:</span>
                        <span className="text-green-600 font-medium">{data.filled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Empty:</span>
                        <span className="text-orange-600 font-medium">{data.empty}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Total:</span>
                        <span className="font-medium">{data.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Movement History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cylinder Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From → To</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement: CylinderMovement) => (
                    <motion.tr key={movement.movement_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movement.movement_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.cylinder_type_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {formatMovementType(movement.movement_type || '')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.from_location_type ? `${movement.from_location_type} → ` : ''}
                        {movement.to_location_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        {movement.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.moved_by_name}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
