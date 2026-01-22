'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Calculator, Truck, Save, User, MapPin, Calendar, Clock, FileText, Package,RefreshCw } from 'lucide-react';
import { CustomerMaster } from '../../../../types/customer';
import { LocationMaster } from '../../../../types/location';
import { VehicleMaster } from '../../../../types/vehicle';
import { DriverMaster } from '../../../../types/driver';
import { CylinderTypeMaster } from '../../../../types/cylinderType';
import { RateContractMaster } from '../../../../types/rateContract';
import { CreateDeliveryTransactionRequest, CreateDeliveryLineRequest } from '../../../../types/deliveryTransaction';
import { customerApi } from '../../../../lib/api/customerApi';
import { locationApi } from '../../../../lib/api/locationApi';
import { vehicleApi } from '../../../../lib/api/vehicleApi';
import { driverApi } from '../../../../lib/api/driverApi';
import { cylinderTypeApi } from '../../../../lib/api/cylinderTypeApi';
import { rateContractApi } from '../../../../lib/api/rateContractApi';
import { deliveryTransactionApi } from '../../../../lib/api/deliveryTransactionApi';
import { cylinderInventoryApi } from '../../../../lib/api/cylinderInventoryApi';
import { InventoryItem } from '../../../../types/cylinderInventory';
import toast, { Toaster } from 'react-hot-toast';

// Comprehensive error handling utility
const handleApiError = (error: unknown, action: string, fallbackMessage?: string) => {
  console.error(`Error ${action}:`, error);
  const errorMessage = error instanceof Error ? error.message : fallbackMessage || `Failed to ${action}`;
  toast.error(`Unable to ${action}: ${errorMessage}`);
  return errorMessage;
};

// Network connectivity check
const isNetworkError = (error: unknown): boolean => {
  return error instanceof Error && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch')
  );
};

interface DeliveryLine {
  cylinder_type_id: number;
  cylinder_description: string;
  delivered_qty: number;
  returned_qty: number;
  rate_applied: number;
  line_amount: number;
}

export default function DeliveryPage() {
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [drivers, setDrivers] = useState<DriverMaster[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [rateContracts, setRateContracts] = useState<RateContractMaster[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMaster | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationMaster | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMaster | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverMaster | null>(null);
  const [selectedRateContract, setSelectedRateContract] = useState<RateContractMaster | null>(null);

  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryLines, setDeliveryLines] = useState<DeliveryLine[]>([]);
  const [customerInventory, setCustomerInventory] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCustomer && selectedRateContract) {
      updateLineRates();
    }
  }, [selectedRateContract, cylinderTypes]);

  const setLoadingState = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setLoadingState('customers', true);
      setLoadingState('locations', true);
      setLoadingState('vehicles', true);
      setLoadingState('drivers', true);
      setLoadingState('cylinderTypes', true);

      const [customersData, locationsData, vehiclesData, driversData, cylinderTypesData] = await Promise.allSettled([
        customerApi.getAllCustomers(),
        locationApi.getAllLocations(),
        vehicleApi.getAllVehicles(),
        driverApi.getAllDrivers(),
        cylinderTypeApi.getAllCylinderTypes(),
      ]);

      // Handle each promise result individually
      if (customersData.status === 'fulfilled') {
        setCustomers(customersData.value);
      } else {
        handleApiError(customersData.reason, 'load customers');
      }

      if (locationsData.status === 'fulfilled') {
        setLocations(locationsData.value);
      } else {
        handleApiError(locationsData.reason, 'load locations');
      }

      if (vehiclesData.status === 'fulfilled') {
        setVehicles(vehiclesData.value);
      } else {
        handleApiError(vehiclesData.reason, 'load vehicles');
      }

      if (driversData.status === 'fulfilled') {
        setDrivers(driversData.value);
      } else {
        handleApiError(driversData.reason, 'load drivers');
      }

      if (cylinderTypesData.status === 'fulfilled') {
        setCylinderTypes(cylinderTypesData.value);
      } else {
        handleApiError(cylinderTypesData.reason, 'load cylinder types');
      }

      // Set default date/time only if we have basic data
      if (customersData.status === 'fulfilled' || locationsData.status === 'fulfilled') {
        const now = new Date();
        setDeliveryDate(now.toISOString().split('T')[0]);
        setDeliveryTime(now.toTimeString().slice(0, 5));
      }

    } catch (error) {
      handleApiError(error, 'load initial data', 'Unable to load customers, locations, vehicles, drivers, and cylinder types. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
      setLoadingState('customers', false);
      setLoadingState('locations', false);
      setLoadingState('vehicles', false);
      setLoadingState('drivers', false);
      setLoadingState('cylinderTypes', false);
    }
  };

  const fetchRateContracts = async (customerType: string) => {
    try {
      setLoadingState('rateContracts', true);
      const allContracts = await rateContractApi.getAllRateContracts();
      const activeContracts = allContracts.filter(contract =>
        contract.customer_type === customerType || contract.customer_type === 'ALL'
      );
      setRateContracts(activeContracts);
    } catch (error) {
      handleApiError(error, 'load rate contracts', 'Unable to load pricing information. You can still create the delivery but pricing may not be accurate.');
    } finally {
      setLoadingState('rateContracts', false);
    }
  };

  const fetchCustomerInventory = async (customerId: number) => {
    try {
      setLoadingState('customerInventory', true);
      const response = await cylinderInventoryApi.getInventory({
        locationType: 'CUSTOMER',
        referenceId: customerId
      });
      setCustomerInventory(response.data || []);
    } catch (error) {
      console.error('Error fetching customer inventory:', error);
      setCustomerInventory([]);
      // Don't show error toast for inventory fetch failures as it's not critical
    } finally {
      setLoadingState('customerInventory', false);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    try {
      const customer = customers.find(c => c.CustomerId === parseInt(customerId));
      setSelectedCustomer(customer || null);

      if (customer) {
        // Determine customer type (you might need to add this field to CustomerMaster)
        const customerType = 'DIRECT'; // Default, you can enhance this
        await Promise.all([
          fetchRateContracts(customerType),
          fetchCustomerInventory(customer.CustomerId)
        ]);
      } else {
        setRateContracts([]);
        setSelectedRateContract(null);
        setCustomerInventory([]);
      }
    } catch (error) {
      handleApiError(error, 'update customer selection');
    }
  };

  const handleRateContractChange = (contractId: string) => {
    try {
      const contract = rateContracts.find(c => c.rate_contract_id === parseInt(contractId));
      setSelectedRateContract(contract || null);
    } catch (error) {
      console.error('Error selecting rate contract:', error);
      toast.error('Error selecting rate contract');
    }
  };

  const updateLineRates = () => {
    try {
      if (!selectedRateContract) return;

      setDeliveryLines(prevLines =>
        prevLines.map(line => {
          const contractForCylinder = rateContracts.find(rc =>
            rc.cylinder_type_id === line.cylinder_type_id &&
            (rc.customer_type === selectedRateContract.customer_type || rc.customer_type === 'ALL')
          );

          const rateApplied = contractForCylinder?.rate_per_cylinder || selectedRateContract.rate_per_cylinder;
          const lineAmount = line.delivered_qty * rateApplied;

          return {
            ...line,
            rate_applied: rateApplied,
            line_amount: lineAmount
          };
        })
      );
    } catch (error) {
      console.error('Error updating line rates:', error);
      toast.error('Error calculating pricing. Please check rate contract settings.');
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
      if (deliveryLines.some(line => line.cylinder_type_id === cylinderType.CylinderTypeId)) {
        toast.error('Cylinder type already added to delivery');
        return;
      }

      const rateApplied = selectedRateContract?.rate_per_cylinder || 0;

      const newLine: DeliveryLine = {
        cylinder_type_id: cylinderType.CylinderTypeId,
        cylinder_description: cylinderType.Capacity, // Using Capacity as the description
        delivered_qty: 0,
        returned_qty: 0,
        rate_applied: rateApplied,
        line_amount: 0
      };

      setDeliveryLines(prev => [...prev, newLine]);
      toast.success(`${cylinderType.Capacity} cylinder type added to delivery`);
    } catch (error) {
      handleApiError(error, 'add cylinder type');
    }
  };

  const updateLineQuantity = (index: number, field: 'delivered_qty' | 'returned_qty', value: number) => {
    try {
      setDeliveryLines(prevLines =>
        prevLines.map((line, i) => {
          if (i === index) {
            const updatedLine = { ...line, [field]: Math.max(0, value) };
            // IMPORTANT: Billing is ONLY based on delivered cylinders, not reduced by returned ones
            updatedLine.line_amount = updatedLine.delivered_qty * updatedLine.rate_applied;
            return updatedLine;
          }
          return line;
        })
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error updating cylinder quantity');
    }
  };

  const removeLine = (index: number) => {
    try {
      setDeliveryLines(prev => prev.filter((_, i) => i !== index));
      toast.success('Cylinder type removed from delivery');
    } catch (error) {
      console.error('Error removing line:', error);
      toast.error('Error removing cylinder type');
    }
  };

  const calculateTotals = () => {
    try {
      const totalDelivered = deliveryLines.reduce((sum, line) => sum + line.delivered_qty, 0);
      const totalReturned = deliveryLines.reduce((sum, line) => sum + line.returned_qty, 0);
      const totalAmount = deliveryLines.reduce((sum, line) => sum + line.line_amount, 0);

      return { totalDelivered, totalReturned, totalAmount };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return { totalDelivered: 0, totalReturned: 0, totalAmount: 0 };
    }
  };

  const validateDeliveryData = () => {
    const errors: string[] = [];

    if (!selectedCustomer) errors.push('Please select a customer');
    if (!selectedLocation) errors.push('Please select a delivery location');
    if (!selectedVehicle) errors.push('Please select a vehicle');
    if (!selectedDriver) errors.push('Please select a driver');
    if (!selectedRateContract) errors.push('Please select a rate contract');
    if (!deliveryDate) errors.push('Please select a delivery date');
    if (!deliveryTime) errors.push('Please select a delivery time');
    if (deliveryLines.length === 0) errors.push('Please add at least one cylinder type');

    const hasValidQuantities = deliveryLines.some(line => line.delivered_qty > 0 || line.returned_qty > 0);
    if (!hasValidQuantities) errors.push('Please enter quantities for at least one cylinder type');

    return errors;
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      const validationErrors = validateDeliveryData();
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      setIsSubmitting(true);

      const requestData: CreateDeliveryTransactionRequest = {
        customer_id: selectedCustomer!.CustomerId,
        location_id: selectedLocation!.LocationId,
        vehicle_id: selectedVehicle!.vehicle_id,
        driver_id: selectedDriver!.driver_id,
        rate_contract_id: selectedRateContract!.rate_contract_id,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        lines: deliveryLines.map(line => ({
          cylinder_type_id: line.cylinder_type_id,
          delivered_qty: line.delivered_qty,
          returned_qty: line.returned_qty
        }))
      };

      await deliveryTransactionApi.createDeliveryTransaction(requestData);

      toast.success('Delivery transaction created successfully!');

      // Reset form
      setSelectedCustomer(null);
      setSelectedLocation(null);
      setSelectedVehicle(null);
      setSelectedDriver(null);
      setSelectedRateContract(null);
      setDeliveryLines([]);
      setRateContracts([]);

  } catch (error) {
    console.error('Delivery transaction creation failed:', error);

    if (isNetworkError(error)) {
      toast.error('Network connection lost. Please check your internet connection and try again.');
    } else if (error instanceof Error) {
      // Show the actual server error message directly in toast
      const errorMessage = error.message.includes('Customer doesn\'t have enough empty cylinders')
        ? error.message
        : error.message.includes('Not enough')
        ? error.message
        : error.message.includes('required')
        ? `Validation Error: ${error.message}`
        : error.message.includes('Invalid') || error.message.includes('not found')
        ? `Data Error: ${error.message}`
        : `Transaction Error: ${error.message}`;

      toast.error(errorMessage);
    } else {
      toast.error('An unexpected error occurred while creating the delivery transaction. Please try again.');
    }
  } finally {
      setIsSubmitting(false);
    }
  };

  const { totalDelivered, totalReturned, totalAmount } = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading delivery form...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Initialize Plant</h1>
            <p className="text-sm text-gray-600">Create new delivery transactions</p>
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
        {/* Left Column - Delivery Details */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  value={selectedCustomer?.CustomerId || ''}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  disabled={loadingStates.customers}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStates.customers ? 'Loading customers...' : 'Select customer'}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.CustomerId} value={customer.CustomerId}>
                      {customer.CustomerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <select
                  value={selectedLocation?.LocationId || ''}
                  onChange={(e) => {
                    const location = locations.find(l => l.LocationId === parseInt(e.target.value));
                    setSelectedLocation(location || null);
                  }}
                  disabled={loadingStates.locations}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStates.locations ? 'Loading locations...' : 'Select location'}
                  </option>
                  {locations.map((location) => (
                    <option key={location.LocationId} value={location.LocationId}>
                      {location.LocationName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Customer Inventory */}
          {selectedCustomer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Current Customer Inventory</h3>
                {loadingStates.customerInventory && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>

              {customerInventory.length > 0 ? (
                <div className="space-y-3">
                  {customerInventory
                    .sort((a, b) => a.cylinderTypeName.localeCompare(b.cylinderTypeName))
                    .map((item) => (
                    <div key={item.inventoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.cylinderStatus === 'FILLED' ? 'bg-green-500' : 'bg-orange-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{item.cylinderTypeName}</p>
                          <p className="text-sm text-gray-600 capitalize">{item.cylinderStatus.toLowerCase()} cylinders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{item.quantity}</p>
                        <p className="text-xs text-gray-500">available</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Tip:</strong> Returned cylinders are automatically considered empty for inventory purposes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {loadingStates.customerInventory ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Loading inventory...
                    </div>
                  ) : (
                    <div>
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No cylinders currently with this customer</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vehicle & Driver */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Truck className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Transport Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle *
                </label>
                <select
                  value={selectedVehicle?.vehicle_id || ''}
                  onChange={(e) => {
                    const vehicle = vehicles.find(v => v.vehicle_id === parseInt(e.target.value));
                    setSelectedVehicle(vehicle || null);
                  }}
                  disabled={loadingStates.vehicles}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStates.vehicles ? 'Loading vehicles...' : 'Select vehicle'}
                  </option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_number} ({vehicle.vehicle_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver *
                </label>
                <select
                  value={selectedDriver?.driver_id || ''}
                  onChange={(e) => {
                    const driver = drivers.find(d => d.driver_id === parseInt(e.target.value));
                    setSelectedDriver(driver || null);
                  }}
                  disabled={loadingStates.drivers}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStates.drivers ? 'Loading drivers...' : 'Select driver'}
                  </option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.driver_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delivery Schedule</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time *
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Rate Contract */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Rate Contract</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Rate Contract *
              </label>
              <select
                value={selectedRateContract?.rate_contract_id || ''}
                onChange={(e) => handleRateContractChange(e.target.value)}
                disabled={loadingStates.rateContracts}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">
                  {loadingStates.rateContracts ? 'Loading contracts...' : 'Select rate contract'}
                </option>
                {rateContracts.map((contract) => (
                  <option key={contract.rate_contract_id} value={contract.rate_contract_id}>
                    {contract.contract_name} - ₹{contract.rate_per_cylinder}/{contract.cylinder_type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Cylinder Lines */}
        <div className="space-y-6">
          {/* Cylinder Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cylinder Types</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Cylinder Type
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

          {/* Delivery Lines */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cylinder Quantities</h3>
            </div>

            <div className="space-y-4">
              {deliveryLines.map((line, index) => (
                <motion.div
                  key={line.cylinder_type_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{line.cylinder_description}</h4>
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
                        Delivered *
                      </label>
                      <input
                        type="number"
                        value={line.delivered_qty}
                        onChange={(e) => updateLineQuantity(index, 'delivered_qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Returned
                      </label>
                      <input
                        type="number"
                        value={line.returned_qty}
                        onChange={(e) => updateLineQuantity(index, 'returned_qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        Rate: ₹{line.rate_applied}/cylinder
                      </span>
                      <span className="font-medium text-gray-900">
                        Amount: ₹{line.line_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {deliveryLines.length === 0 && (
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Delivered:</span>
                <span className="font-medium">{totalDelivered} cylinders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Returned:</span>
                <span className="font-medium">{totalReturned} cylinders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net Quantity:</span>
                <span className="font-medium">{totalDelivered - totalReturned} cylinders</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedCustomer || !selectedLocation || !selectedVehicle || !selectedDriver || !selectedRateContract || deliveryLines.length === 0}
              className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Creating Transaction...' : 'Create Delivery Transaction'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
