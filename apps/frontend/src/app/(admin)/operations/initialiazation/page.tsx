'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Package, Save, RefreshCw, Warehouse, Truck, Building2, User } from 'lucide-react';
import { CustomerMaster } from '../../../../types/customer';
import { VehicleMaster } from '../../../../types/vehicle';
import { CylinderTypeMaster } from '../../../../types/cylinderType';
import { customerApi } from '../../../../lib/api/customerApi';
import { vehicleApi } from '../../../../lib/api/vehicleApi';
import { cylinderTypeApi } from '../../../../lib/api/cylinderTypeApi';
import { cylinderInventoryApi } from '../../../../lib/api/cylinderInventoryApi';
import toast, { Toaster } from 'react-hot-toast';

// Comprehensive error handling utility
const handleApiError = (error: unknown, action: string, fallbackMessage?: string) => {
  console.error(`Error ${action}:`, error);
  const errorMessage = error instanceof Error ? error.message : fallbackMessage || `Failed to ${action}`;
  toast.error(`Unable to ${action}: ${errorMessage}`);
  return errorMessage;
};

interface InventoryLine {
  cylinderTypeId: number;
  cylinderTypeName: string;
  quantity: number;
  cylinderStatus: 'FILLED' | 'EMPTY';
}

interface VehicleInventory {
  vehicle_id: number;
  vehicle_number: string;
  inventory: Array<{
    cylinderTypeId: number;
    cylinderTypeName: string;
    quantity: number;
    cylinderStatus: 'FILLED' | 'EMPTY';
  }>;
  totalQuantity: number;
}

export default function InventoryInitializationPage() {
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);

  const [selectedLocationType, setSelectedLocationType] = useState<string>('');
  const [selectedReference, setSelectedReference] = useState<CustomerMaster | VehicleMaster | null>(null);
  const [inventoryLines, setInventoryLines] = useState<InventoryLine[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Vehicle inventory management states
  const [vehicleInventoryList, setVehicleInventoryList] = useState<VehicleInventory[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInventory | null>(null);
  const [isMovingToPlant, setIsMovingToPlant] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchVehicleInventory();
  }, []);

  const setLoadingState = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const fetchVehicleInventory = async () => {
    try {
      setLoadingState('vehicleInventory', true);
      
      // Get all vehicles with inventory
      const vehicleInventoryData = await cylinderInventoryApi.getInventory({
        locationType: 'VEHICLE'
      });
      
      if (vehicleInventoryData.data && vehicleInventoryData.data.length > 0) {
        // Group inventory by vehicle
        const vehicleGroups: Record<number, VehicleInventory> = {};
        
        vehicleInventoryData.data.forEach(item => {
          const vehicleId = item.locationReferenceId;
          if (!vehicleId) return;
          
          if (!vehicleGroups[vehicleId]) {
            const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
            vehicleGroups[vehicleId] = {
              vehicle_id: vehicleId,
              vehicle_number: vehicle?.vehicle_number || `Vehicle ${vehicleId}`,
              inventory: [],
              totalQuantity: 0
            };
          }
          
          const cylinderType = cylinderTypes.find(ct => ct.CylinderTypeId === item.cylinderTypeId);
          vehicleGroups[vehicleId].inventory.push({
            cylinderTypeId: item.cylinderTypeId,
            cylinderTypeName: cylinderType?.Capacity || `Type ${item.cylinderTypeId}`,
            quantity: item.quantity,
            cylinderStatus: item.cylinderStatus as 'FILLED' | 'EMPTY'
          });
          
          vehicleGroups[vehicleId].totalQuantity += item.quantity;
        });
        
        setVehicleInventoryList(Object.values(vehicleGroups));
      } else {
        setVehicleInventoryList([]);
      }
    } catch (error) {
      handleApiError(error, 'load vehicle inventory');
      setVehicleInventoryList([]);
    } finally {
      setLoadingState('vehicleInventory', false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setLoadingState('customers', true);
      setLoadingState('vehicles', true);
      setLoadingState('cylinderTypes', true);

      const [customersData, vehiclesData, cylinderTypesData] = await Promise.allSettled([
        customerApi.getAllCustomers(),
        vehicleApi.getAllVehicles(),
        cylinderTypeApi.getAllCylinderTypes(),
      ]);

      // Handle each promise result individually
      if (customersData.status === 'fulfilled') {
        setCustomers(customersData.value);
      } else {
        handleApiError(customersData.reason, 'load customers');
      }

      if (vehiclesData.status === 'fulfilled') {
        setVehicles(vehiclesData.value);
      } else {
        handleApiError(vehiclesData.reason, 'load vehicles');
      }

      if (cylinderTypesData.status === 'fulfilled') {
        setCylinderTypes(cylinderTypesData.value);
      } else {
        handleApiError(cylinderTypesData.reason, 'load cylinder types');
      }

      // Fetch vehicle inventory after vehicles and cylinder types are loaded
      await fetchVehicleInventory();

    } catch (error) {
      handleApiError(error, 'load initial data', 'Unable to load customers, vehicles, and cylinder types. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
      setLoadingState('customers', false);
      setLoadingState('vehicles', false);
      setLoadingState('cylinderTypes', false);
    }
  };

  const moveVehicleToPlant = async () => {
    if (!selectedVehicle) {
      toast.error('Please select a vehicle');
      return;
    }

    try {
      setIsMovingToPlant(true);

      // Create movements for each cylinder type in the vehicle
      const movementPromises = selectedVehicle.inventory.map(async (item) => {
        return await cylinderInventoryApi.createMovement({
          cylinderTypeId: item.cylinderTypeId,
          fromLocationType: 'VEHICLE',
          fromLocationReferenceId: selectedVehicle.vehicle_id,
          toLocationType: 'YARD',
          toLocationReferenceId: undefined,
          quantity: item.quantity,
          cylinderStatus: item.cylinderStatus,
          movementType: 'TRANSFER',
          notes: `Moved ${item.quantity} ${item.cylinderTypeName} (${item.cylinderStatus}) from ${selectedVehicle.vehicle_number} to Yard`
        });
      });

      await Promise.all(movementPromises);

      toast.success(`Successfully moved ${selectedVehicle.totalQuantity} cylinders from ${selectedVehicle.vehicle_number} to Yard`);

      // Refresh vehicle inventory
      await fetchVehicleInventory();
      setSelectedVehicle(null);

    } catch (error) {
      handleApiError(error, 'move cylinders to yard');
    } finally {
      setIsMovingToPlant(false);
    }
  };

  const handleLocationTypeChange = (locationType: string) => {
    setSelectedLocationType(locationType);
    setSelectedReference(null);
  };

  const handleReferenceChange = (referenceId: string) => {
    if (selectedLocationType === 'CUSTOMER') {
      const customer = customers.find(c => c.CustomerId === parseInt(referenceId));
      setSelectedReference(customer || null);
    } else if (selectedLocationType === 'VEHICLE') {
      const vehicle = vehicles.find(v => v.vehicle_id === parseInt(referenceId));
      setSelectedReference(vehicle || null);
    }
  };

  const addCylinderType = (cylinderTypeId: string) => {
    try {
      const cylinderType = cylinderTypes.find(ct => ct.CylinderTypeId === parseInt(cylinderTypeId));
      if (!cylinderType) {
        toast.error('Selected cylinder type not found');
        return;
      }

      // Check if already exists
      if (inventoryLines.some(line => line.cylinderTypeId === cylinderType.CylinderTypeId)) {
        toast.error('Cylinder type already added');
        return;
      }

      const newLine: InventoryLine = {
        cylinderTypeId: cylinderType.CylinderTypeId,
        cylinderTypeName: cylinderType.Capacity,
        quantity: 0,
        cylinderStatus: 'FILLED'
      };

      setInventoryLines(prev => [...prev, newLine]);
      toast.success(`${cylinderType.Capacity} cylinder type added`);
    } catch (error) {
      handleApiError(error, 'add cylinder type');
    }
  };

  const updateLineQuantity = (index: number, quantity: number) => {
    try {
      setInventoryLines(prevLines =>
        prevLines.map((line, i) =>
          i === index ? { ...line, quantity: Math.max(0, quantity) } : line
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error updating cylinder quantity');
    }
  };

  const updateLineStatus = (index: number, cylinderStatus: 'FILLED' | 'EMPTY') => {
    try {
      setInventoryLines(prevLines =>
        prevLines.map((line, i) =>
          i === index ? { ...line, cylinderStatus } : line
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating cylinder status');
    }
  };

  const removeLine = (index: number) => {
    try {
      setInventoryLines(prev => prev.filter((_, i) => i !== index));
      toast.success('Cylinder type removed');
    } catch (error) {
      console.error('Error removing line:', error);
      toast.error('Error removing cylinder type');
    }
  };

  const validateInventoryData = () => {
    const errors: string[] = [];

    if (!selectedLocationType) errors.push('Please select a location type');
    if ((selectedLocationType === 'CUSTOMER' || selectedLocationType === 'VEHICLE') && !selectedReference) {
      errors.push('Please select a reference for this location type');
    }
    if (inventoryLines.length === 0) errors.push('Please add at least one cylinder type');

    const hasValidQuantities = inventoryLines.some(line => line.quantity > 0);
    if (!hasValidQuantities) errors.push('Please enter quantities for at least one cylinder type');

    return errors;
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      const validationErrors = validateInventoryData();
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      setIsSubmitting(true);

      const requestData = {
        locationType: selectedLocationType,
        referenceId: (selectedLocationType === 'CUSTOMER' || selectedLocationType === 'VEHICLE')
          ? (selectedLocationType === 'CUSTOMER'
              ? (selectedReference as CustomerMaster)?.CustomerId
              : (selectedReference as VehicleMaster)?.vehicle_id)
          : undefined,
        cylinders: inventoryLines.map(line => ({
          cylinderTypeId: line.cylinderTypeId,
          quantity: line.quantity,
          cylinderStatus: line.cylinderStatus
        }))
      };

      await cylinderInventoryApi.initializeInventory(requestData);

      toast.success('Inventory initialized successfully!');

      // Reset form
      setSelectedLocationType('');
      setSelectedReference(null);
      setInventoryLines([]);

    } catch (error) {
      console.error('Inventory initialization failed:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred while initializing inventory. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotals = () => {
    try {
      const totalQuantity = inventoryLines.reduce((sum, line) => sum + line.quantity, 0);
      const filledCount = inventoryLines.filter(line => line.cylinderStatus === 'FILLED').reduce((sum, line) => sum + line.quantity, 0);
      const emptyCount = inventoryLines.filter(line => line.cylinderStatus === 'EMPTY').reduce((sum, line) => sum + line.quantity, 0);

      return { totalQuantity, filledCount, emptyCount };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return { totalQuantity: 0, filledCount: 0, emptyCount: 0 };
    }
  };

  const { totalQuantity, filledCount, emptyCount } = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading inventory initialization...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Initialize Inventory</h1>
            <p className="text-sm text-gray-600">Add cylinders to locations to start tracking inventory</p>
          </div>
        </div>
        <button
          onClick={fetchInitialData}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Location Selection */}
        <div className="space-y-6">
          {/* Location Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Warehouse className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Type *
                </label>
                <select
                  value={selectedLocationType}
                  onChange={(e) => handleLocationTypeChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select location type</option>
                  <option value="YARD">Yard</option>
                  <option value="PLANT">Plant</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="REFILLING">Refilling Station</option>
                </select>
              </div>

              {/* Reference Selection (conditional) */}
              {(selectedLocationType === 'CUSTOMER' || selectedLocationType === 'VEHICLE') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedLocationType === 'CUSTOMER' ? 'Customer' : 'Vehicle'} *
                  </label>
                  <select
                    value={selectedReference ? (selectedLocationType === 'CUSTOMER'
                      ? (selectedReference as CustomerMaster).CustomerId
                      : (selectedReference as VehicleMaster).vehicle_id) : ''}
                    onChange={(e) => handleReferenceChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      Select {selectedLocationType === 'CUSTOMER' ? 'customer' : 'vehicle'}
                    </option>
                    {selectedLocationType === 'CUSTOMER' ? (
                      customers.map((customer) => (
                        <option key={customer.CustomerId} value={customer.CustomerId}>
                          {customer.CustomerName}
                        </option>
                      ))
                    ) : (
                      vehicles.map((vehicle) => (
                        <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                          {vehicle.vehicle_number}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Inventory Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Truck className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Move Cylinders from Vehicles to Yard</h3>
            </div>

            {loadingStates.vehicleInventory ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Loading vehicle inventory...</p>
              </div>
            ) : vehicleInventoryList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No cylinders found in vehicles</p>
                <p className="text-sm text-gray-400 mt-1">All vehicles are empty or no inventory data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle
                  </label>
                  <select
                    value={selectedVehicle?.vehicle_id || ''}
                    onChange={(e) => {
                      const vehicle = vehicleInventoryList.find(v => v.vehicle_id === parseInt(e.target.value));
                      setSelectedVehicle(vehicle || null);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a vehicle with cylinders</option>
                    {vehicleInventoryList.map((vehicle) => (
                      <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.vehicle_number} ({vehicle.totalQuantity} cylinders)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedVehicle && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{selectedVehicle.vehicle_number}</h4>
                      <span className="text-sm text-gray-600">{selectedVehicle.totalQuantity} cylinders</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {selectedVehicle.inventory.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{item.cylinderTypeName}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.cylinderStatus === 'FILLED' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {item.cylinderStatus}
                            </span>
                            <span className="font-medium">{item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={moveVehicleToPlant}
                      disabled={isMovingToPlant}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>{isMovingToPlant ? 'Moving to Yard...' : 'Move All Cylinders to Yard'}</span>
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Cylinder Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Add Cylinder Types</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cylinder Type
              </label>
              <div className="flex space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addCylinderType(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={loadingStates.cylinderTypes}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStates.cylinderTypes ? 'Loading cylinder types...' : 'Select cylinder type'}
                  </option>
                  {cylinderTypes.map((type) => (
                    <option key={type.CylinderTypeId} value={type.CylinderTypeId}>
                      {type.Capacity}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Inventory Lines */}
        <div className="space-y-6">
          {/* Inventory Lines */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cylinder Inventory</h3>
            </div>

            <div className="space-y-4">
              {inventoryLines.map((line, index) => (
                <motion.div
                  key={line.cylinderTypeId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{line.cylinderTypeName}</h4>
                    <button
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLineQuantity(index, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={line.cylinderStatus}
                        onChange={(e) => updateLineStatus(index, e.target.value as 'FILLED' | 'EMPTY')}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="FILLED">Filled</option>
                        <option value="EMPTY">Empty</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              ))}

              {inventoryLines.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No cylinder types added yet</p>
                  <p className="text-sm text-gray-400 mt-1">Select a cylinder type above to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Initialization Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cylinders:</span>
                <span className="font-medium">{totalQuantity} cylinders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filled Cylinders:</span>
                <span className="font-medium text-green-600">{filledCount} cylinders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Empty Cylinders:</span>
                <span className="font-medium text-orange-600">{emptyCount} cylinders</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <strong>Location:</strong> {selectedLocationType || 'Not selected'}
                  {selectedReference && (
                    <>
                      <br />
                      <strong>Reference:</strong> {selectedLocationType === 'CUSTOMER'
                        ? (selectedReference as CustomerMaster).CustomerName
                        : (selectedReference as VehicleMaster).vehicle_number}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedLocationType || inventoryLines.length === 0}
              className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Initializing Inventory...' : 'Initialize Inventory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
