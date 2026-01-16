'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  FileText,
  ClipboardList,
  MapPin,
  BarChart3,
  Users,
  Building2,
  RefreshCw,
  Download,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const operationsPages = [
  {
    id: 'cylinder-inventory',
    title: 'Cylinder Inventory',
    description: 'Track cylinder quantities across all locations (Yard, Vehicles, Customers, Plant, Refilling)',
    icon: Package,
    href: '/operations/cylinder-inventory',
    color: 'bg-blue-500',
    features: [
      'Real-time quantity tracking by location',
      'Dual view modes (by cylinder type/location)',
      'Automatic updates from delivery operations',
      'PDF export reports',
      'Movement history and audit trail'
    ]
  },
  {
    id: 'delivery',
    title: 'Dispatch Note',
    description: 'Create and manage delivery transactions with cylinder details',
    icon: Truck,
    href: '/operations/delivery',
    color: 'bg-green-500',
    features: [
      'Create delivery transactions',
      'Specify cylinder quantities by type',
      'Assign vehicles and drivers',
      'Track delivery status',
      'Automatic inventory updates'
    ]
  },
  {
    id: 'gr',
    title: 'Goods Receipt',
    description: 'Manage goods receipt approvals and trip closures',
    icon: FileText,
    href: '/operations/gr',
    color: 'bg-purple-500',
    features: [
      'Approve delivery receipts',
      'Track advance amounts',
      'Finalize deliveries',
      'Close completed trips',
      'Generate GR reports'
    ]
  },
  {
    id: 'delivery-reports',
    title: 'Delivery Reports',
    description: 'Comprehensive reporting and analytics for all delivery operations',
    icon: BarChart3,
    href: '/operations/delivery-reports',
    color: 'bg-orange-500',
    features: [
      'Delivery transaction history',
      'GR status tracking',
      'Customer and vehicle reports',
      'Export to PDF',
      'Search and filter capabilities'
    ]
  }
];

export default function OperationsPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operations Overview</h1>
            <p className="text-sm text-gray-600">Manage all cylinder operations and track inventory movements</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Operations</p>
              <p className="text-2xl font-bold text-gray-900">{operationsPages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Modules</p>
              <p className="text-2xl font-bold text-gray-900">{operationsPages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Locations Tracked</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Reports Generated</p>
              <p className="text-2xl font-bold text-gray-900">∞</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {operationsPages.map((page) => (
          <motion.div
            key={page.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => setHoveredCard(page.id)}
            onHoverEnd={() => setHoveredCard(null)}
            className="group"
          >
            <Link href={page.href}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 h-full">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-12 h-12 ${page.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <page.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {page.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {page.description}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {page.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {page.features.length > 3 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{page.features.length - 3} more features...
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Click to access</span>
                      <motion.div
                        animate={{ x: hoveredCard === page.id ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-blue-600 group-hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Workflow Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cylinder Management Workflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: 1, title: 'Inventory', description: 'Track cylinder quantities', icon: Package, color: 'bg-blue-500' },
            { step: 2, title: 'Dispatch', description: 'Create delivery transactions', icon: Truck, color: 'bg-green-500' },
            { step: 3, title: 'Movement', description: 'Auto-update locations', icon: RefreshCw, color: 'bg-yellow-500' },
            { step: 4, title: 'Receipt', description: 'Approve goods receipts', icon: FileText, color: 'bg-purple-500' },
            { step: 5, title: 'Reports', description: 'Generate analytics', icon: BarChart3, color: 'bg-orange-500' }
          ].map((step, index) => (
            <div key={step.step} className="text-center">
              <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 text-sm">{step.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{step.description}</p>
              {index < 4 && (
                <div className="hidden md:block absolute mt-6 ml-6">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/operations/cylinder-inventory">
            <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Check Inventory</h4>
                  <p className="text-sm text-gray-600">View current cylinder locations</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/operations/delivery">
            <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <Plus className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">New Delivery</h4>
                  <p className="text-sm text-gray-600">Create delivery transaction</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/operations/delivery-reports">
            <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <Download className="w-8 h-8 text-orange-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Export Report</h4>
                  <p className="text-sm text-gray-600">Generate delivery reports</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
