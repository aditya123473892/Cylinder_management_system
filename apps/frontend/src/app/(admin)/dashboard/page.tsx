
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, MapPin, Users, TrendingUp, TrendingDown, 
  Truck, AlertTriangle, DollarSign, Calendar, Filter,
  ChevronDown, Activity, Clock, CheckCircle, XCircle,
  Bell, Settings, Menu
} from 'lucide-react';

export default function CylinderDashboard() {
  const [dateRange, setDateRange] = useState('today');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showSubDealer, setShowSubDealer] = useState(true);

  // Sample data
  const inventoryData = [
    { label: 'Total Cylinders', value: '12,458', icon: Package, color: 'blue' },
    { label: 'At Company Location', value: '4,823', icon: MapPin, color: 'green' },
    { label: 'With Customers', value: '5,234', icon: Users, color: 'purple' },
    { label: 'With Sub-Dealers', value: '1,876', icon: Users, color: 'orange' },
    { label: 'In Transit', value: '425', icon: Truck, color: 'yellow' },
    { label: 'Under Maintenance', value: '100', icon: AlertTriangle, color: 'red' }
  ];

  const movementData = [
    { label: 'Delivered Today', value: '142', trend: '+12%', icon: TrendingUp },
    { label: 'Returned Today', value: '98', trend: '+8%', icon: TrendingDown },
    { label: 'Net Movement', value: '+44', trend: 'positive', icon: Activity },
    { label: 'Pending Returns', value: '67', trend: '-5%', icon: Clock }
  ];

  const retentionData = [
    { label: 'Standard Days', value: '30' },
    { label: 'Average Days', value: '27.3' },
    { label: 'Exceeding Retention', value: '234' }
  ];

  const deliveryStatus = [
    { label: 'Pending Deliveries', value: '45' },
    { label: 'Allocated Not Delivered', value: '23' },
    { label: 'Delivered Not Acknowledged', value: '12' },
    { label: 'Vehicles Assigned', value: '18' },
    { label: 'Vehicles Pending', value: '5' }
  ];

  const billingData = [
    { label: 'Invoices Generated', value: '₹8,45,600', icon: DollarSign },
    { label: 'Paid Amount', value: '₹6,23,400', icon: CheckCircle },
    { label: 'Unpaid Amount', value: '₹2,22,200', icon: Clock },
    { label: 'Outstanding Balance', value: '₹3,45,800', icon: AlertTriangle }
  ];

  const alerts = [
    { type: 'critical', message: '234 cylinders exceeding retention threshold', count: 234 },
    { type: 'warning', message: '12 overdue deliveries', count: 12 },
    { type: 'info', message: '5 missing delivery acknowledgements', count: 5 },
    { type: 'warning', message: '3 low stock alerts', count: 3 }
  ];

  const topRetention = [
    { name: 'Customer A', days: 45, cylinders: 34 },
    { name: 'Customer B', days: 42, cylinders: 28 },
    { name: 'Sub-Dealer X', days: 38, cylinders: 45 },
    { name: 'Customer C', days: 36, cylinders: 19 },
    { name: 'Sub-Dealer Y', days: 35, cylinders: 23 }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900">Cylinder Management</h1>
                <p className="text-xs text-blue-600">Real-time Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              <Calendar className="w-4 h-4 text-blue-600" />
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-sm bg-transparent border-none text-blue-900 font-medium focus:outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              <MapPin className="w-4 h-4 text-blue-600" />
              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="text-sm bg-transparent border-none text-blue-900 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Locations</option>
                <option value="warehouse-a">Warehouse A</option>
                <option value="warehouse-b">Warehouse B</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              <Users className="w-4 h-4 text-blue-600" />
              <select className="text-sm bg-transparent border-none text-blue-900 font-medium focus:outline-none cursor-pointer">
                <option>All Sub-Dealers</option>
                <option>Sub-Dealer 1</option>
                <option>Sub-Dealer 2</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              <Truck className="w-4 h-4 text-blue-600" />
              <select className="text-sm bg-transparent border-none text-blue-900 font-medium focus:outline-none cursor-pointer">
                <option>All Transporters</option>
                <option>Transporter A</option>
                <option>Transporter B</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Inventory Overview */}
        <section>
          <h2 className="text-lg font-bold text-blue-900 mb-4">Inventory Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {inventoryData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 bg-${item.color}-100 rounded-lg flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <p className="text-xs text-blue-700 mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-blue-900">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Movement Summary */}
        <section>
          <h2 className="text-lg font-bold text-blue-900 mb-4">Cylinder Movement Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {movementData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <item.icon className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-green-600">{item.trend}</span>
                </div>
                <p className="text-xs text-blue-700 mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-blue-900">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Retention & Delivery Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Retention Overview */}
          <section>
            <h2 className="text-lg font-bold text-blue-900 mb-4">Retention Overview</h2>
            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
              <div className="grid grid-cols-3 gap-4 mb-5">
                {retentionData.map((item, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xs text-blue-700 mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-blue-900">{item.value}</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-blue-100 pt-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Top 5 by Retention</h3>
                <div className="space-y-2">
                  {topRetention.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">{item.name}</p>
                        <p className="text-xs text-blue-600">{item.cylinders} cylinders</p>
                      </div>
                      <span className={`text-sm font-bold ${item.days > 35 ? 'text-red-600' : 'text-orange-600'}`}>
                        {item.days} days
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Delivery Status */}
          <section>
            <h2 className="text-lg font-bold text-blue-900 mb-4">Delivery & Allocation Status</h2>
            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm space-y-3">
              {deliveryStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">{item.label}</p>
                  <span className="text-lg font-bold text-blue-600">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Billing & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Billing Summary */}
          <section>
            <h2 className="text-lg font-bold text-blue-900 mb-4">Billing Summary</h2>
            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm space-y-3">
              {billingData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-blue-900">{item.label}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-900">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Alerts */}
          <section>
            <h2 className="text-lg font-bold text-blue-900 mb-4">Alerts & Exceptions</h2>
            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm space-y-3">
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.type === 'critical' ? 'bg-red-50 border border-red-200' :
                    alert.type === 'warning' ? 'bg-orange-50 border border-orange-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.type === 'critical' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-orange-600' :
                      'text-blue-600'
                    }`} />
                    <p className="text-sm font-medium text-blue-900">{alert.message}</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${
                    alert.type === 'critical' ? 'bg-red-100 text-red-700' :
                    alert.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sub-Dealer Overview */}
        {showSubDealer && (
          <section>
            <h2 className="text-lg font-bold text-blue-900 mb-4">Sub-Dealer Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Active Sub-Dealers', value: '24' },
                { label: 'Cylinders Issued', value: '1,876' },
                { label: 'With Customers', value: '1,234' },
                { label: 'Avg. Retention Days', value: '32.5' },
                { label: 'Outstanding Balance', value: '₹1,23,400' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm"
                >
                  <p className="text-xs text-blue-700 mb-1">{item.label}</p>
                  <p className="text-2xl font-bold text-blue-900">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Transport Snapshot */}
        <section>
          <h2 className="text-lg font-bold text-blue-900 mb-4">Transport & Location Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Cylinders by Location</h3>
              <div className="space-y-2">
                {['Main Warehouse: 2,834', 'Warehouse B: 1,989', 'Distribution Center: 1,523'].map((loc, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-900">{loc.split(':')[0]}</span>
                    <span className="text-sm font-bold text-blue-600">{loc.split(':')[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">In Transit by Transporter</h3>
              <div className="space-y-2">
                {['Transporter A: 234', 'Transporter B: 156', 'Transporter C: 35'].map((trans, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-900">{trans.split(':')[0]}</span>
                    <span className="text-sm font-bold text-blue-600">{trans.split(':')[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Active Vehicles</h3>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-blue-900 mb-2">18</p>
                <p className="text-sm text-blue-700">Currently on delivery</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
