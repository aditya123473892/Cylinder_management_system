'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Users, BarChart3, Shield, Zap, Globe } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const [[page, direction], setPage] = useState([0, 0]);

  const toggleForm = () => {
    const newDirection = isLogin ? 1 : -1;
    setPage([page + newDirection, newDirection]);
    setIsLogin(!isLogin);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLogin) {
      console.log('Login:', { loginEmail, loginPassword });
    } else {
      console.log('Signup:', { companyName, signupName, signupEmail, signupPassword, agreeToTerms });
    }
  };

  const features = [
    {
      icon: Truck,
      title: 'Real-Time Tracking',
      description: 'Monitor your entire fleet with live GPS tracking and instant location updates.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Get insights into fuel consumption, driver behavior, and operational efficiency.'
    },
    {
      icon: Users,
      title: 'Driver Management',
      description: 'Manage driver schedules, performance metrics, and compliance requirements.'
    },
    {
      icon: Shield,
      title: 'Security & Compliance',
      description: 'Enterprise-grade security with full regulatory compliance and data protection.'
    },
    {
      icon: Zap,
      title: 'Automated Workflows',
      description: 'Streamline operations with intelligent automation and task scheduling.'
    },
    {
      icon: Globe,
      title: 'Global Operations',
      description: 'Manage fleets across multiple regions with multi-language support.'
    }
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-white">
      {/* Chess board pattern background */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.02]">
        {[...Array(64)].map((_, i) => (
          <div
            key={i}
            className={`${(Math.floor(i / 8) + i) % 2 === 0 ? 'bg-blue-900' : 'bg-transparent'}`}
          />
        ))}
      </div>

      {/* Left Side - Product Info */}
      <div className="hidden lg:flex lg:w-1/2 relative p-8 flex-col justify-between bg-gradient-to-br from-blue-50 to-white">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-900">Team eLogisol</h1>
              <p className="text-xs text-blue-700">Fleet Management</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-3 text-blue-900">
            The complete logistics solution for modern fleet operations.
          </h2>
          <p className="text-base text-blue-700 mb-8">
            Streamline, optimize, and scale your transportation business.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-start p-3 rounded-lg bg-white shadow-sm border border-blue-100 hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                  <feature.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-blue-900 mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-blue-700 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-blue-600">
          © 2025 Team eLogisol. All rights reserved.
        </p>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-900">Team eLogisol</h1>
              <p className="text-xs text-blue-700">Fleet Management SaaS</p>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="relative flex mb-6 bg-blue-50 rounded-lg p-1">
            <motion.div
              className="absolute inset-y-1 bg-white rounded-md shadow-sm border border-blue-100"
              initial={false}
              animate={{
                x: isLogin ? 0 : '100%',
                width: '50%'
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => !isLogin && toggleForm()}
              className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors ${
                isLogin ? 'text-blue-900' : 'text-blue-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => isLogin && toggleForm()}
              className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors ${
                !isLogin ? 'text-blue-900' : 'text-blue-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Container */}
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-1 text-blue-900">Welcome Back</h2>
                    <p className="text-sm text-blue-700">Enter your credentials to access your account</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-1.5 w-3.5 h-3.5 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <span className="text-xs text-blue-900">Remember me</span>
                      </label>
                      <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        Forgot password?
                      </a>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSubmit}
                      className="w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Sign In
                    </motion.button>
                  </div>

                  <p className="mt-5 text-center text-xs text-blue-700">
                    Don't have an account?{' '}
                    <button onClick={toggleForm} className="font-semibold text-blue-600 hover:text-blue-700">
                      Sign up
                    </button>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-1 text-blue-900">Create Account</h2>
                    <p className="text-sm text-blue-700">Get started with Fleet Management</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="Your Company Ltd"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <label className="flex items-start cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mr-1.5 mt-0.5 w-3.5 h-3.5 rounded border-blue-300 checked:bg-blue-600 checked:border-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-xs text-blue-900">
                        I agree to the Terms of Service and Privacy Policy
                      </span>
                    </label>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSubmit}
                      className="w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Create Account
                    </motion.button>
                  </div>

                  <p className="mt-5 text-center text-xs text-blue-700">
                    Already have an account?{' '}
                    <button onClick={toggleForm} className="font-semibold text-blue-600 hover:text-blue-700">
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}