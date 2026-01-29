'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  BarChart3,
  Users,
  Truck,
  FileText,
  Settings,
  Menu,
  X,
  Home,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../contexts/SidebarContext';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
  },
  {
    name: 'Operations',
    href: '/operations',
    icon: Truck,
    children: [
      {
        name: 'Cylinder Inventory',
        href: '/operations/inventory',
      },
      {
        name: 'Delivery Orders',
        href: '/operations/delivery-orders',
      },
      {
        name: 'Dispatch Notes & Exchange',
        href: '/operations/dispatch-notes',
      },
            {
        name: 'Cylinder Initialization',
        href: '/operations/initialiazation',
      },
      {
        name: 'Goods Receipt',
        href: '/operations/gr',
      },
      {
        name: 'Delivery Reports',
        href: '/operations/delivery-reports',
      },
      {
        name :'Dispatch orders',
        href: '/operations/dispatch-orders-final',
      },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: FileText,
  },
  {
    name: 'Masters',
    href: '/masters',
    icon: Users,
    children: [
      {
        name: 'Cylinder Types',
        href: '/masters/cylinders',
      },
      {
        name: 'Locations',
        href: '/masters/locations',
      },
      {
        name: 'Customers',
        href: '/masters/customers',
      },
      {
        name: 'Vehicles',
        href: '/masters/vehicles',
      },
      {
        name: 'Drivers', 
        href: '/masters/drivers',
      },
      {
        name: 'Rate Contracts',
        href: '/masters/rate-contracts',
      },
      {
        name: 'Dealers',
        href: '/masters/dealers',
      },
      {
        name: 'Transporters',
        href: '/masters/transporters',
      },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isItemExpanded = (itemName: string) => expandedItems.includes(itemName);

  const hasActiveChild = (item: any) => {
    if (!item.children) return false;
    return item.children.some((child: any) => pathname === child.href);
  };

  return (
    <motion.div
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-full bg-white border-r border-gray-200 shadow-lg overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Cylinder</h1>
                <p className="text-xs text-gray-500">Management</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="expand"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </motion.div>
            ) : (
              <motion.div
                key="collapse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = isItemExpanded(item.name);
          const hasActiveChildItem = hasActiveChild(item);

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={`flex items-center justify-between w-full px-3 py-3 rounded-lg transition-all duration-200 group ${
                    isActive || hasActiveChildItem
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${(isActive || hasActiveChildItem) ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />

                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="font-medium"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {!isCollapsed && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </motion.div>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && !isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-8 mt-1 space-y-1"
                    >
                      {item.children.map((child: any) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                              isChildActive
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />

              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
                <p className="text-xs text-gray-500 truncate">Administrator</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-profile"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}