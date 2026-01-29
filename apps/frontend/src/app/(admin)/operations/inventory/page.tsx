'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, Building2, Warehouse, AlertTriangle, Loader2, RefreshCw, Filter, X } from 'lucide-react';
import { cylinderInventoryApi } from '../../../../lib/api/cylinderInventoryApi';
import { cylinderTypeApi } from '../../../../lib/api/cylinderTypeApi';
import { customerApi } from '../../../../lib/api/customerApi';
import { vehicleApi } from '../../../../lib/api/vehicleApi';
import { InventoryDashboard, InventoryItem, InventoryQuery } from '../../../../types/cylinderInventory';
import { CylinderTypeMaster } from '../../../../types/cylinderType';
import { CustomerMaster } from '../../../../types/customer';
import { VehicleMaster } from '../../../../types/vehicle';
import toast, { Toaster } from 'react-hot-toast';

export default function InventoryPage() {
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  // Filter states
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [filters, setFilters] = useState<InventoryQuery>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      loadFilteredInventory();
    } else {
      // When no filters, reload full dashboard
      loadInitialData();
    }
  }, [filters]);

  // Remove the dashboard recalculation - let the API handle totals correctly
  // useEffect(() => {
  //   if (Object.keys(filters).length > 0 && inventoryItems.length > 0) {
  //     const calculatedDashboard = calculateDashboardFromItems(inventoryItems);
  //     setDashboard(calculatedDashboard);
  //   }
  // }, [inventoryItems, filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, cylinderTypesRes, customersRes, vehiclesRes] = await Promise.all([
        cylinderInventoryApi.getInventoryDashboard(),
        cylinderTypeApi.getAllCylinderTypes(),
        customerApi.getAllCustomers(),
        vehicleApi.getAllVehicles()
      ]);

      setDashboard(dashboardRes.data);
      setCylinderTypes(cylinderTypesRes);
   
      setCustomers(customersRes);
      setVehicles(vehiclesRes);

      // Load all inventory initially
      await loadFilteredInventory();
    } catch (error) {
      toast.error('Failed to load inventory data');
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredInventory = async () => {
    try {
      setFilterLoading(true);
      const response = await cylinderInventoryApi.getInventory(filters);
      setInventoryItems(response.data);
      
      // Load system dashboard totals (not filtered) to show correct overall picture
      const dashboardResponse = await cylinderInventoryApi.getInventoryDashboard();
      setDashboard(dashboardResponse.data);
    } catch (error) {
      toast.error('Failed to load filtered inventory');
      console.error('Error loading filtered inventory:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleFilterChange = (key: keyof InventoryQuery, value: any) => {
    const newFilters = { ...filters };

    if (value === '' || value === undefined || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }

    // Clear reference ID when location type changes
    if (key === 'locationType') {
      delete newFilters.referenceId;
    }

    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getReferenceOptions = () => {
    if (filters.locationType === 'CUSTOMER') {
      return customers.map(customer => ({
        value: customer.CustomerId,
        label: customer.CustomerName
      }));
    } else if (filters.locationType === 'VEHICLE') {
      return vehicles.map(vehicle => ({
        value: vehicle.vehicle_id,
        label: vehicle.vehicle_number
      }));
    }
    return [];
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

  const getCustomerName = (referenceId: number | null | undefined): string | null => {
    if (!referenceId) return null;
    
    // Use the correct field name based on CustomerMaster type
    const customer = customers.find(c => c.CustomerId === referenceId);
    
    
    if (customer) {
      // Use the correct field name for customer name
      return customer.CustomerName || `Customer ${referenceId}`;
    }
    
    return null;
  };

  const getVehicleName = (referenceId: number | null | undefined): string | null => {
    if (!referenceId) return null;
    
    // Use the correct field name based on VehicleMaster type
    const vehicle = vehicles.find(v => v.vehicle_id === referenceId);
    
    
    if (vehicle) {
      // Use the correct field name for vehicle number
      return vehicle.vehicle_number || `Vehicle ${referenceId}`;
    }
    
    return null;
  };

  const getLocationDisplayName = (item: InventoryItem): string => {
    const locationType = item.locationType.toLowerCase();
    
    if (locationType === 'customer') {
      // First try to use the reference name from the item
      if (item.locationReferenceName) {
        return `Customer: ${item.locationReferenceName}`;
      }
      // If no reference name but we have filters applied, try to find from customers array
      if (filters.locationType === 'CUSTOMER' && filters.referenceId) {
        const customerName = getCustomerName(filters.referenceId);
        if (customerName) {
          return `Customer: ${customerName}`;
        }
      }
      // If we have a reference ID, try to find the customer name
      if (item.locationReferenceId) {
        const customerName = getCustomerName(item.locationReferenceId);
        if (customerName) {
          return `Customer: ${customerName}`;
        }
      }
      // Fallback to just showing customer type
      return 'Customer';
    }
    
    if (locationType === 'vehicle') {
      // First try to use the reference name from the item
      if (item.locationReferenceName) {
        return `Vehicle: ${item.locationReferenceName}`;
      }
      // If no reference name but we have filters applied, try to find from vehicles array
      if (filters.locationType === 'VEHICLE' && filters.referenceId) {
        const vehicleName = getVehicleName(filters.referenceId);
        if (vehicleName) {
          return `Vehicle: ${vehicleName}`;
        }
      }
      // If we have a reference ID, try to find the vehicle name
      if (item.locationReferenceId) {
        const vehicleName = getVehicleName(item.locationReferenceId);
        if (vehicleName) {
          return `Vehicle: ${vehicleName}`;
        }
      }
      // Fallback to just showing vehicle type
      return 'Vehicle';
    }
    
    // For yard and plant, just capitalize the location type
    return locationType.charAt(0).toUpperCase() + locationType.slice(1);
  };

  const calculateDashboardFromItems = (items: InventoryItem[]): InventoryDashboard => {
    let totalCylinders = 0;
    const byLocation = {
      yard: { filled: 0, empty: 0, total: 0 },
      plant: { filled: 0, empty: 0, total: 0 },
      customers: { filled: 0, empty: 0, total: 0 },
      vehicles: { filled: 0, empty: 0, total: 0 },
    };

    items.forEach(item => {
      totalCylinders += item.quantity;

      const locationType = item.locationType.toLowerCase();
      const status = item.cylinderStatus.toLowerCase();

      if (locationType === 'yard') {
        byLocation.yard.total += item.quantity;
        if (status === 'filled') byLocation.yard.filled += item.quantity;
        else if (status === 'empty') byLocation.yard.empty += item.quantity;
      } else if (locationType === 'plant') {
        byLocation.plant.total += item.quantity;
        if (status === 'filled') byLocation.plant.filled += item.quantity;
        else if (status === 'empty') byLocation.plant.empty += item.quantity;
      } else if (locationType === 'customer') {
        byLocation.customers.total += item.quantity;
        if (status === 'filled') byLocation.customers.filled += item.quantity;
        else if (status === 'empty') byLocation.customers.empty += item.quantity;
      } else if (locationType === 'vehicle') {
        byLocation.vehicles.total += item.quantity;
        if (status === 'filled') byLocation.vehicles.filled += item.quantity;
        else if (status === 'empty') byLocation.vehicles.empty += item.quantity;
      }
    });

    return {
      totalCylinders,
      byLocation,
      recentMovements: [], // Not needed for filtered dashboard
      alerts: [] // Not needed for filtered dashboard
    };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading inventory data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cylinder Inventory</h1>
          <p className="text-gray-600">Find and filter cylinders by type and location</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filter Indicator */}
      {Object.keys(filters).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              Filters applied: Showing {inventoryItems.length} filtered items from {dashboard?.totalCylinders || 0} total cylinders
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Summary */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Yard (Empty)</dt>
                    <dd className="text-lg font-medium text-orange-600">{dashboard.byLocation.yard.empty.toLocaleString()}</dd>
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
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Filter Cylinders</h3>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cylinder Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cylinder Type
              </label>
              <select
                value={filters.cylinderTypeId || ''}
                onChange={(e) => handleFilterChange('cylinderTypeId', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {cylinderTypes.map((type) => (
                  <option key={type.CylinderTypeId} value={type.CylinderTypeId}>
                    {type.Capacity}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type
              </label>
              <select
                value={filters.locationType || ''}
                onChange={(e) => handleFilterChange('locationType', e.target.value || undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                <option value="YARD">Yard</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="CUSTOMER">Customer</option>
                <option value="PLANT">Plant</option>
                <option value="REFILLING">Refilling</option>
              </select>
            </div>

            {/* Reference Filter (conditional) */}
            {(filters.locationType === 'CUSTOMER' || filters.locationType === 'VEHICLE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filters.locationType === 'CUSTOMER' ? 'Customer' : 'Vehicle'}
                </label>
                <select
                  value={filters.referenceId || ''}
                  onChange={(e) => handleFilterChange('referenceId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All {filters.locationType === 'CUSTOMER' ? 'Customers' : 'Vehicles'}</option>
                  {getReferenceOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.cylinderStatus || ''}
                onChange={(e) => handleFilterChange('cylinderStatus', e.target.value || undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="FILLED">Filled</option>
                <option value="EMPTY">Empty</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Cylinder Inventory Results
              {filterLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
            </h3>
            <div className="text-sm text-gray-500">
              Showing {inventoryItems.length} cylinders
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-2 text-xs text-gray-400">
                  (Debug: Items loaded: {inventoryItems.length}, FilterLoading: {filterLoading ? 'true' : 'false'})
                </span>
              )}
            </div>
          </div>

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
                {filterLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex items justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                        Loading filtered results...
                      </div>
                    </td>
                  </tr>
                ) : inventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No cylinders found matching the current filters
                    </td>
                  </tr>
                ) : (
                  inventoryItems.map((item: InventoryItem) => (
                    <motion.tr key={item.inventoryId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {getLocationIcon(item.locationType)}
                          <span>
                            {getLocationDisplayName(item)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          if (item.locationType.toLowerCase() === 'customer') {
                            if (item.locationReferenceName) {
                              return item.locationReferenceName;
                            }
                            if (item.locationReferenceId) {
                              const customerName = getCustomerName(item.locationReferenceId);
                              return customerName || `Customer ID: ${item.locationReferenceId}`;
                            }
                            return 'General Customer';
                          }
                          if (item.locationType.toLowerCase() === 'vehicle') {
                            if (item.locationReferenceId) {
                              const vehicleName = getVehicleName(item.locationReferenceId);
                              return vehicleName || `Vehicle ID: ${item.locationReferenceId}`;
                            }
                            return 'General Vehicle';
                          }
                          return '-';
                        })()}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
