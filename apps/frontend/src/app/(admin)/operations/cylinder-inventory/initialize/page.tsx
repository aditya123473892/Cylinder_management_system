'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Save, ArrowLeft, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cylinderTypeApi } from '../../../../../lib/api/cylinderTypeApi';
import { cylinderInventoryApi } from '../../../../../lib/api/cylinderInventoryApi';
import { CylinderTypeMaster } from '../../../../../types/cylinderType';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface InventoryItem {
  cylinder_type_id: number;
  cylinder_capacity: string;
  quantity: number;
}

export default function InitializeInventoryPage() {
  const [cylinderTypes, setCylinderTypes] = useState<CylinderTypeMaster[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasExistingInventory, setHasExistingInventory] = useState(false);

  useEffect(() => {
    fetchCylinderTypes();
    checkExistingInventory();
  }, []);

  const fetchCylinderTypes = async () => {
    try {
      const types = await cylinderTypeApi.getAllCylinderTypes();
      setCylinderTypes(types);

      // Initialize inventory data with 0 quantities
      const initialData = types.map(type => ({
        cylinder_type_id: type.CylinderTypeId,
        cylinder_capacity: type.Capacity,
        quantity: 0
      }));
      setInventoryData(initialData);
    } catch (error) {
      console.error('Error fetching cylinder types:', error);
      toast.error('Failed to load cylinder types');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingInventory = async () => {
    try {
      const summary = await cylinderInventoryApi.getInventorySummary();
      setHasExistingInventory(summary.length > 0);
    } catch (error) {
      // Ignore errors here - if inventory doesn't exist, that's expected
      setHasExistingInventory(false);
    }
  };

  const handleQuantityChange = (cylinderTypeId: number, quantity: number) => {
    setInventoryData(prev =>
      prev.map(item =>
        item.cylinder_type_id === cylinderTypeId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      )
    );
  };

  const handleInitializeInventory = async () => {
    const validData = inventoryData.filter(item => item.quantity > 0);

    if (validData.length === 0) {
      toast.error('Please enter at least one quantity greater than 0');
      return;
    }

    try {
      setIsInitializing(true);
      await cylinderInventoryApi.initializeInventory(validData);

      toast.success('Inventory initialized successfully!');
      setHasExistingInventory(true);

      // Redirect to inventory page after success
      setTimeout(() => {
        window.location.href = '/admin/operations/cylinder-inventory';
      }, 2000);

    } catch (error) {
      console.error('Error initializing inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize inventory');
    } finally {
      setIsInitializing(false);
    }
  };

  const setDefaultQuantities = () => {
    setInventoryData(prev =>
      prev.map(item => ({
        ...item,
        quantity: 100 // Default starting quantity
      }))
    );
  };

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
          <Link
            href="/admin/operations/cylinder-inventory"
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Initialize Inventory</h1>
            <p className="text-sm text-gray-600">Set up starting cylinder quantities in your YARD</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={setDefaultQuantities}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Set Default (100 each)</span>
          </button>

          <button
            onClick={handleInitializeInventory}
            disabled={isInitializing}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isInitializing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isInitializing ? 'Initializing...' : 'Initialize Inventory'}</span>
          </button>
        </div>
      </div>

      {/* Warning for existing inventory */}
      {hasExistingInventory && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Existing Inventory Detected</h3>
              <p className="text-sm text-amber-700 mt-1">
                Inventory already exists. Initializing will add to existing quantities.
                If you want to start fresh, you'll need to clear existing data first.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">How Inventory Initialization Works:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter starting quantities for each cylinder type in your YARD location</li>
              <li>• These cylinders will be available for delivery operations</li>
              <li>• You can modify quantities later using inventory adjustments</li>
              <li>• Once initialized, deliveries will automatically move cylinders between locations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Inventory Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cylinder Quantities</h2>
          <p className="text-sm text-gray-600">Set starting quantities for each cylinder type in YARD storage</p>
        </div>

        <div className="divide-y divide-gray-200">
          {inventoryData.map((item) => (
            <motion.div
              key={item.cylinder_type_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{item.cylinder_capacity} Cylinder</h3>
                  <p className="text-sm text-gray-600">ID: {item.cylinder_type_id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.cylinder_type_id, parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                  placeholder="0"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {inventoryData.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cylinder Types Found</h3>
            <p className="text-gray-600 mb-6">
              You need to create cylinder types first before initializing inventory.
            </p>
            <Link
              href="/admin/masters/cylinders"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Cylinder Types
            </Link>
          </div>
        )}
      </div>

      {/* Summary */}
      {inventoryData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {inventoryData.filter(item => item.quantity > 0).length}
              </div>
              <div className="text-sm text-blue-700">Cylinder Types with Stock</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {inventoryData.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="text-sm text-green-700">Total Cylinders</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {inventoryData.length}
              </div>
              <div className="text-sm text-purple-700">Total Cylinder Types</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
