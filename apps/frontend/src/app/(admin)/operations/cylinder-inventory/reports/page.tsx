'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Truck,
  Users,
  Building2,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Eye
} from 'lucide-react';
import { CylinderInventorySummary, CylinderLocationSummary } from '../../../../../types/cylinderInventory';
import { cylinderInventoryApi } from '../../../../../lib/api/cylinderInventoryApi';
import { PDFGenerator } from '../../../../../lib/pdfGenerator';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

interface InventoryReportData {
  summary: CylinderInventorySummary[];
  locations: CylinderLocationSummary[];
  totals: {
    totalCylinders: number;
    totalLocations: number;
    activeVehicles: number;
    activeCustomers: number;
  };
}

export default function CylinderInventoryReportsPage() {
  const [reportData, setReportData] = useState<InventoryReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const [inventoryData, locationData] = await Promise.all([
        cylinderInventoryApi.getInventorySummary(),
        cylinderInventoryApi.getLocationSummary(),
      ]);

      const inventorySummary = Array.isArray(inventoryData) ? inventoryData : [];
      const locationSummary = Array.isArray(locationData) ? locationData : [];

      // Calculate totals
      const totalCylinders = inventorySummary.reduce((sum, item) => sum + item.total_quantity, 0);
      const totalLocations = locationSummary.length;
      const activeVehicles = locationSummary.filter(loc => loc.location_type === 'VEHICLE' && loc.total_cylinders > 0).length;
      const activeCustomers = locationSummary.filter(loc => loc.location_type === 'CUSTOMER' && loc.total_cylinders > 0).length;

      setReportData({
        summary: inventorySummary,
        locations: locationSummary,
        totals: {
          totalCylinders,
          totalLocations,
          activeVehicles,
          activeCustomers
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load inventory report');
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
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'VEHICLE':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'CUSTOMER':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'PLANT':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'REFILLING':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const filteredLocations = reportData?.locations.filter(location => {
    const matchesType = filterType === 'all' || location.location_type === filterType;
    const matchesSearch = !searchTerm ||
      location.location_reference_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.location_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  const generateDetailedReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Cylinder Inventory Detailed Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 50);

    let yPosition = 80;

    // Summary
    doc.setFontSize(14);
    doc.text('Executive Summary:', 20, yPosition);
    yPosition += 15;
    doc.setFontSize(10);
    doc.text(`Total Cylinders in System: ${reportData?.totals.totalCylinders || 0}`, 30, yPosition);
    yPosition += 8;
    doc.text(`Active Locations: ${reportData?.totals.totalLocations || 0}`, 30, yPosition);
    yPosition += 8;
    doc.text(`Active Vehicles: ${reportData?.totals.activeVehicles || 0}`, 30, yPosition);
    yPosition += 8;
    doc.text(`Active Customers: ${reportData?.totals.activeCustomers || 0}`, 30, yPosition);
    yPosition += 20;

    // Location Details
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Location Details:', 20, yPosition);
    yPosition += 15;

    filteredLocations.forEach((location, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(12);
      const locationName = location.location_reference_name
        ? `${location.location_type} - ${location.location_reference_name}`
        : location.location_type;
      doc.text(`${index + 1}. ${locationName}: ${location.total_cylinders} cylinders`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      location.cylinder_types.forEach(cylinder => {
        doc.text(`   - ${cylinder.cylinder_capacity}: ${cylinder.quantity}`, 30, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    });

    doc.save(`Cylinder_Inventory_Detailed_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cylinder Inventory Reports</h1>
          <p className="text-sm text-gray-600">Comprehensive cylinder location and quantity analysis</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={generateDetailedReport}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Detailed PDF</span>
          </button>

          <button
            onClick={fetchReportData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-xl p-6 border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Cylinders</p>
              <p className="text-3xl font-bold text-blue-900">{reportData?.totals.totalCylinders || 0}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 rounded-xl p-6 border border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Vehicles</p>
              <p className="text-3xl font-bold text-green-900">{reportData?.totals.activeVehicles || 0}</p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-purple-50 rounded-xl p-6 border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Active Customers</p>
              <p className="text-3xl font-bold text-purple-900">{reportData?.totals.activeCustomers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-50 rounded-xl p-6 border border-orange-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Locations</p>
              <p className="text-3xl font-bold text-orange-900">{reportData?.totals.totalLocations || 0}</p>
            </div>
            <MapPin className="w-8 h-8 text-orange-600" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filters:</span>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="YARD">Yard</option>
              <option value="VEHICLE">Vehicles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="PLANT">Plants</option>
              <option value="REFILLING">Refilling</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-64"
            />
          </div>
        </div>
      </div>

      {/* Location Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cylinder Locations & Quantities</h2>
          <p className="text-sm text-gray-600">Detailed breakdown of cylinders by location</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cylinders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cylinder Breakdown
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLocations.map((location, index) => (
                <motion.tr
                  key={`${location.location_type}-${location.location_reference_name || ''}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLocationColor(location.location_type)}`}>
                        {getLocationIcon(location.location_type)}
                        <span className="ml-1">{location.location_type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {location.location_reference_name || 'General Storage'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">
                      {location.total_cylinders}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {location.cylinder_types.map((cylinder, cylIndex) => (
                        <span
                          key={cylIndex}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {cylinder.cylinder_capacity}: {cylinder.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLocations.length === 0 && (
          <div className="px-6 py-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all'
                ? 'No locations match your current filters.'
                : 'No cylinder inventory locations found. Initialize inventory to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Cylinder Type Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cylinder Type Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData?.summary.map((item, index) => (
            <motion.div
              key={item.cylinder_type_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">{item.cylinder_capacity}</h3>
                <span className="text-2xl font-bold text-blue-700">{item.total_quantity}</span>
              </div>
              <div className="text-sm text-blue-700">
                Distributed across {item.locations.length} location{item.locations.length !== 1 ? 's' : ''}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
