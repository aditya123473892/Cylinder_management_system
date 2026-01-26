'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, 
  Package, 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Step Components
import LoadStep from './components/LoadStep';
import DeliverStep from './components/DeliverStep';
import ConfirmStep from './components/ConfirmStep';

interface DeliverySession {
  id: string;
  currentStep: 1 | 2 | 3;
  selectedOrders: any[];
  selectedVehicle: any;
  selectedDriver: any;
  loadingData: any;
  deliveryData: any;
  confirmationData: any;
}

const DeliverySimplePage = () => {
  const [session, setSession] = useState<DeliverySession>({
    id: '',
    currentStep: 1,
    selectedOrders: [],
    selectedVehicle: null,
    selectedDriver: null,
    loadingData: {},
    deliveryData: {},
    confirmationData: {}
  });

  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { id: 1, name: 'LOAD', description: 'Vehicle Loading', icon: Truck },
    { id: 2, name: 'DELIVER', description: 'Customer Delivery', icon: Package },
    { id: 3, name: 'CONFIRM', description: 'Exchange Confirmation', icon: CheckCircle }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < session.currentStep) return 'completed';
    if (stepId === session.currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (stepId: number) => {
    const status = getStepStatus(stepId);
    const Icon = steps[stepId - 1].icon;
    
    if (status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    } else if (status === 'current') {
      return <Icon className="w-6 h-6 text-blue-600" />;
    } else {
      return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const canGoNext = () => {
    switch (session.currentStep) {
      case 1:
        return session.selectedOrders.length > 0 && session.selectedVehicle && session.selectedDriver;
      case 2:
        return session.deliveryData?.delivered;
      case 3:
        return session.confirmationData?.confirmed;
      default:
        return false;
    }
  };

  const canGoBack = () => {
    return session.currentStep > 1;
  };

  const goToNextStep = () => {
    if (canGoNext() && session.currentStep < 3) {
      setSession(prev => ({
        ...prev,
        currentStep: (prev.currentStep + 1) as 1 | 2 | 3
      }));
    }
  };

  const goToPreviousStep = () => {
    if (canGoBack()) {
      setSession(prev => ({
        ...prev,
        currentStep: (prev.currentStep - 1) as 1 | 2 | 3
      }));
    }
  };

  const resetSession = () => {
    setSession({
      id: '',
      currentStep: 1,
      selectedOrders: [],
      selectedVehicle: null,
      selectedDriver: null,
      loadingData: {},
      deliveryData: {},
      confirmationData: {}
    });
  };

  const updateSessionData = (step: string, data: any) => {
    setSession(prev => ({
      ...prev,
      [step]: data
    }));
  };

  const renderCurrentStep = () => {
    switch (session.currentStep) {
      case 1:
        return (
          <LoadStep
            session={session}
            onUpdate={(data) => updateSessionData('loadingData', data)}
            onOrdersSelect={(orders) => setSession(prev => ({ ...prev, selectedOrders: orders }))}
            onVehicleSelect={(vehicle) => setSession(prev => ({ ...prev, selectedVehicle: vehicle }))}
            onDriverSelect={(driver) => setSession(prev => ({ ...prev, selectedDriver: driver }))}
          />
        );
      case 2:
        return (
          <DeliverStep
            session={session}
            onUpdate={(data) => updateSessionData('deliveryData', data)}
          />
        );
      case 3:
        return (
          <ConfirmStep
            session={session}
            onUpdate={(data) => updateSessionData('confirmationData', data)}
            onComplete={resetSession}
          />
        );
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    return ((session.currentStep - 1) / 2) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Management</h1>
          <p className="text-gray-600">Streamlined 3-step delivery workflow</p>
        </div>

        {/* Progress Stepper */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      {getStepIcon(step.id)}
                    </div>
                    <div className="text-center">
                      <h3 className={`font-semibold text-sm ${
                        getStepStatus(step.id) === 'current' ? 'text-blue-600' : 
                        getStepStatus(step.id) === 'completed' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </h3>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded ${
                      getStepStatus(step.id + 1) === 'pending' ? 'bg-gray-200' : 'bg-green-500'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {renderCurrentStep()}
          </div>

          {/* Sidebar - Session Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Session Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Orders */}
                {session.selectedOrders.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Selected Orders</h4>
                    <div className="space-y-1">
                      {session.selectedOrders.map((order: any) => (
                        <div key={order.order_id} className="text-xs bg-gray-50 p-2 rounded">
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-gray-500">{order.customer_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Vehicle */}
                {session.selectedVehicle && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Vehicle</h4>
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-medium">{session.selectedVehicle.vehicle_number}</div>
                      <div className="text-gray-500">{session.selectedVehicle.vehicle_type}</div>
                    </div>
                  </div>
                )}

                {/* Selected Driver */}
                {session.selectedDriver && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Driver</h4>
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-medium">{session.selectedDriver.name}</div>
                      <div className="text-gray-500">{session.selectedDriver.phone}</div>
                    </div>
                  </div>
                )}

                {/* Status Badges */}
                <div className="pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {session.loadingData?.loaded && (
                      <Badge variant="default" className="text-xs">
                        <Truck className="w-3 h-3 mr-1" />
                        Loaded
                      </Badge>
                    )}
                    {session.deliveryData?.delivered && (
                      <Badge variant="default" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        Delivered
                      </Badge>
                    )}
                    {session.confirmationData?.confirmed && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousStep}
                      disabled={!canGoBack()}
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                      disabled={!canGoNext()}
                      className="flex-1"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetSession}
                    className="w-full"
                  >
                    Reset Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverySimplePage;
