'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Truck, Users, Building2, RefreshCw, Plus, ArrowRight, ArrowLeft, Download, Eye } from 'lucide-react';
import { CylinderInventorySummary, CylinderLocationSummary } from '../../../../types/cylinderInventory';
import { cylinderInventoryApi } from '../../../../lib/api/cylinderInventoryApi';
import { PDFGenerator } from '../../../../lib/pdfGenerator';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function CylinderInventoryPage() {
  const [inventorySummary, setInventorySummary] = useState<CylinderInventorySummary[]>([]);
  const [locationSummary, setLocationSummary] = useState<CylinderLocationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'by-cylinder' | 'by-location'>('by-cylinder');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);
      const [inventoryData, locationData] = await Promise.all([
        cylinderInventoryApi.getInventorySummary(),
        cylinderInventoryApi.getLocationSummary(),
      ]);

      setInventorySummary(Array.isArray(inventoryData) ? inventoryData : []);
      setLocationSummary(Array.isArray(locationData) ? locationData : []);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load cylinder inventory');
      setInventorySummary([]);
      setLocationSummary([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'YARD':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'VEHICLE':
        return <Truck className="w-5 h-5 text-green-600" />;
      case 'CUSTOMER':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'PLANT':
        return <Building2 className="w-5 h-5 text-orange-600" />;
      case 'REFILLING':
        return <RefreshCw className="w-5 h-5 text-red-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLocationColor = (locationType: string) => {
    switch (locationType) {
      case 'YARD':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VEHICLE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CUSTOMER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PLANT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'REFILLING':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const generateInventoryReport = () => {
    // Create a simple PDF report
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Cylinder Inventory Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 50);

    let yPosition = 70;

    if (viewMode === 'by-cylinder') {
      doc.text('Inventory by Cylinder Type:', 20, yPosition);
      yPosition += 20;

      inventorySummary.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(14);
        doc.text(`${item.cylinder_capacity} Cylinders`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        item.locations.forEach(location => {
          doc.text(`  ${location.location_type}: ${location.quantity} cylinders`, 30, yPosition);
          yPosition += 8;
        });

        doc.text(`  Total: ${item.total_quantity} cylinders`, 30, yPosition);
        yPosition += 15;
      });
    } else {
      doc.text('Inventory by Location:', 20, yPosition);
      yPosition += 20;

      locationSummary.forEach((location, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(14);
        doc.text(`${location.location_type}${location.location_reference_name ? ` - ${location.location_reference_name}` : ''}`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        location.cylinder_types.forEach(cylinder => {
          doc.text(`  ${cylinder.cylinder_capacity}: ${cylinder.quantity} cylinders`, 30, yPosition);
          yPosition += 8;
        });

        doc.text(`  Total: ${location.total_cylinders} cylinders`, 30, yPosition);
        yPosition += 15;
      });
    }

    doc.save(`Cylinder_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cylinder Inventory</h1>
            <p className="text-sm text-gray-600">Track cylinder quantities across all locations</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={generateInventoryReport}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={fetchInventoryData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('by-cylinder')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'by-cylinder'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Cylinder Type
            </button>
            <button
              onClick={() => setViewMode('by-location')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'by-location'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Location
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Total Cylinders: {inventorySummary.reduce((sum, item) => sum + item.total_quantity, 0)}
          </div>
        </div>
      </div>

      {/* Inventory Display */}
      {viewMode === 'by-cylinder' ? (
        <div className="space-y-6">
          {inventorySummary.map((item) => (
            <motion.div
              key={item.cylinder_type_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {item.cylinder_capacity} Cylinders
                    </h3>
                    <p className="text-sm text-gray-600">ID: {item.cylinder_type_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {item.total_quantity}
                  </div>
                  <div className="text-sm text-gray-600">Total Cylinders</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {item.locations.map((location, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 ${getLocationColor(location.location_type)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getLocationIcon(location.location_type)}
                        <span className="font-semibold text-sm">
                          {location.location_type}
                        </span>
                      </div>
                      <span className="text-lg font-bold">
                        {location.quantity}
                      </span>
                    </div>

                    {location.location_reference_name && (
                      <div className="text-sm font-medium">
                        {location.location_type === 'VEHICLE' && '🚛 '}
                        {location.location_type === 'CUSTOMER' && '🏢 '}
                        {location.location_type === 'PLANT' && '🏭 '}
                        {location.location_type === 'REFILLING' && '⛽ '}
                        {location.location_reference_name}
                      </div>
                    )}

                    {!location.location_reference_name && location.location_type === 'YARD' && (
                      <div className="text-sm text-gray-600">
                        📦 Main Storage Yard
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Distribution Summary:</span>
                  <div className="flex space-x-4 text-sm">
                    {item.locations.map((location, index) => (
                      <span key={index} className="font-medium">
                        {location.location_type}: {location.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {locationSummary.map((location, index) => (
            <motion.div
              key={`${location.location_type}-${location.location_reference_name || ''}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl shadow-sm border-2 p-6 ${getLocationColor(location.location_type)}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${location.location_type === 'VEHICLE' ? 'bg-green-200' : location.location_type === 'CUSTOMER' ? 'bg-purple-200' : location.location_type === 'YARD' ? 'bg-blue-200' : 'bg-gray-200'}`}>
                    {getLocationIcon(location.location_type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {location.location_type}
                      {location.location_reference_name && ` - ${location.location_reference_name}`}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {location.location_type === 'VEHICLE' && '🚛 Delivery Vehicle'}
                      {location.location_type === 'CUSTOMER' && '🏢 Customer Location'}
                      {location.location_type === 'YARD' && '📦 Main Storage Yard'}
                      {location.location_type === 'PLANT' && '🏭 Manufacturing Plant'}
                      {location.location_type === 'REFILLING' && '⛽ Refilling Station'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    {location.total_cylinders}
                  </div>
                  <div className="text-sm text-gray-700">Total Cylinders</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Cylinder Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {location.cylinder_types.map((cylinder, cylIndex) => (
                    <div key={cylIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {cylinder.cylinder_capacity}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {cylinder.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Cylinder Types:</span>
                  <div className="flex space-x-2 text-sm">
                    {location.cylinder_types.map((cylinder, cylIndex) => (
                      <span key={cylIndex} className="bg-white px-2 py-1 rounded-md font-medium">
                        {cylinder.cylinder_capacity}: {cylinder.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {inventorySummary.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cylinder Inventory Found</h3>
          <p className="text-gray-600 mb-6">
            Start by initializing your cylinder inventory or create some cylinder types first.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Initialize Inventory
          </button>
        </div>
      )}
    </div>
  );
}
