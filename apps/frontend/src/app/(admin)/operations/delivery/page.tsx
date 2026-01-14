'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Calculator, Truck, Save, User, MapPin, Calendar, Clock, FileText, Package } from 'lucide-react';
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
import toast from 'react-hot-toast';

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

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCustomer && selectedRateContract) {
      updateLineRates();
    }
  }, [selectedRateContract, cylinderTypes]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [customersData, locationsData, vehiclesData, driversData, cylinderTypesData] = await Promise.all([
        customerApi.getAllCustomers(),
        locationApi.getAllLocations(),
        vehicleApi.getAllVehicles(),
        driverApi.getAllDrivers(),
        cylinderTypeApi.getAllCylinderTypes(),
      ]);

      setCustomers(customersData);
      setLocations(locationsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setCylinderTypes(cylinderTypesData);

      // Set default date/time
      const now = new Date();
      setDeliveryDate(now.toISOString().split('T')[0]);
      setDeliveryTime(now.toTimeString().slice(0, 5));
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRateContracts = async (customerType: string) => {
    try {
      // Get rate contracts for all cylinder types for the selected customer type
      const allContracts = await rateContractApi.getAllRateContracts();
      const activeContracts = allContracts.filter(contract =>
        contract.customer_type === customerType || contract.customer_type === 'ALL'
      );
      setRateContracts(activeContracts);
    } catch (error) {
      console.error('Error fetching rate contracts:', error);
      toast.error('Failed to load rate contracts');
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    const customer = customers.find(c => c.CustomerId === parseInt(customerId));
    setSelectedCustomer(customer || null);

    if (customer) {
      // Determine customer type (you might need to add this field to CustomerMaster)
      const customerType = 'DIRECT'; // Default, you can enhance this
      await fetchRateContracts(customerType);
    } else {
      setRateContracts([]);
      setSelectedRateContract(null);
    }
  };

  const handleRateContractChange = (contractId: string) => {
    const contract = rateContracts.find(c => c.rate_contract_id === parseInt(contractId));
    setSelectedRateContract(contract || null);
  };

  const updateLineRates = () => {
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
  };

  const addCylinderType = (cylinderTypeId: string) => {
    const cylinderType = cylinderTypes.find(ct => ct.CylinderTypeId === parseInt(cylinderTypeId));
    if (!cylinderType) return;

    // Check if already exists
    if (deliveryLines.some(line => line.cylinder_type_id === cylinderType.CylinderTypeId)) {
      toast.error('Cylinder type already added');
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
  };

  const updateLineQuantity = (index: number, field: 'delivered_qty' | 'returned_qty', value: number) => {
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
  };

  const removeLine = (index: number) => {
    setDeliveryLines(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalDelivered = deliveryLines.reduce((sum, line) => sum + line.delivered_qty, 0);
    const totalReturned = deliveryLines.reduce((sum, line) => sum + line.returned_qty, 0);
    const totalAmount = deliveryLines.reduce((sum, line) => sum + line.line_amount, 0);

    return { totalDelivered, totalReturned, totalAmount };
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedLocation || !selectedVehicle || !selectedDriver || !selectedRateContract) {
      toast.error('Please fill all required fields');
      return;
    }

    if (deliveryLines.length === 0) {
      toast.error('Please add at least one cylinder type');
      return;
    }

    const hasValidQuantities = deliveryLines.some(line => line.delivered_qty > 0 || line.returned_qty > 0);
    if (!hasValidQuantities) {
      toast.error('Please enter quantities for at least one cylinder type');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateDeliveryTransactionRequest = {
        customer_id: selectedCustomer.CustomerId,
        location_id: selectedLocation.LocationId,
        vehicle_id: selectedVehicle.vehicle_id,
        driver_id: selectedDriver.driver_id,
        rate_contract_id: selectedRateContract.rate_contract_id,
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
      console.error('Error creating delivery transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create delivery transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalDelivered, totalReturned, totalAmount } = calculateTotals();

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
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispatch Note</h1>
            <p className="text-sm text-gray-600">Create new delivery transactions</p>
          </div>
        </div>
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select customer</option>
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.LocationId} value={location.LocationId}>
                      {location.LocationName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select vehicle</option>
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select driver</option>
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select rate contract</option>
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
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select cylinder type</option>
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
