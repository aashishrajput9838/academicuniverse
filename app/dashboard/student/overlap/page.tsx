'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { overlapAPI } from '@/utils/api/overlapAPI';
import UploadTimetableModal from '@/components/UploadTimetableModal';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Section {
  _id: string;
  sectionName: string;
  representativeUid: string;
  organizationId: string;
}

interface TimeRange {
  start: string;
  end: string;
}

interface OverlapResult {
  [day: string]: TimeRange[];
}

interface OverlapResponse {
  success: boolean;
  message: string;
  data: {
    sections: string[];
    organizationId: string;
    overlapSlots: OverlapResult;
    totalDays: number;
    timestamp: string;
  };
}

const OverlapEnginePage = () => {
  const { user, backendUser } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [overlapResult, setOverlapResult] = useState<OverlapResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Check if user is admin or section rep - support multiple role formats
  const isAuthorizedToUpload = backendUser && (
    backendUser.role === 'ADMIN' || 
    backendUser.role === 'SUPER_ADMIN' || 
    (backendUser as any).isSectionRep === true ||
    (backendUser as any).permissions?.includes('MANAGE_USERS')
  );

  // Fetch available sections on component mount
  useEffect(() => {
    if (user) {
      fetchAvailableSections();
    }
  }, [user]);

  const fetchAvailableSections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For demo purposes, we'll use a default organization ID
      // In a real implementation, this would come from user's organization
      const orgId = 'demo-org-123';
      setOrganizationId(orgId);

      // Test backend connection first
      const isBackendAvailable = await overlapAPI.testConnection();
      if (!isBackendAvailable) {
        throw new Error('Backend service is not available. Please try again later.');
      }

      // Fetch available sections
      const response = await overlapAPI.getAvailableSections(orgId);
      setSections(response.data.sections || []);
      
    } catch (err: any) {
      console.error('Error fetching sections:', err);
      setError(err.message || 'Failed to load available sections');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    // Refresh sections to show updated timetable status
    fetchAvailableSections();
  };

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        if (prev.length >= 5) {
          return prev; // Don't allow more than 5 selections
        }
        return [...prev, sectionId];
      }
    });
  };

  const calculateOverlap = async () => {
    try {
      setProcessing(true);
      setError(null);
      setOverlapResult(null);
      
      if (selectedSections.length === 0) {
        throw new Error('Please select at least one section');
      }

      // Calculate overlap using the API service
      const response = await overlapAPI.calculateOverlapSlots(selectedSections, organizationId);
      setOverlapResult(response.data.overlapSlots);
      
    } catch (err: any) {
      console.error('Error calculating overlap:', err);
      setError(err.message || 'Failed to calculate overlap slots');
    } finally {
      setProcessing(false);
    }
  };

  const renderSectionSelector = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No sections available for your organization</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section._id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedSections.includes(section._id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
            }`}
            onClick={() => handleSectionToggle(section._id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {section.sectionName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {section._id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSections.includes(section._id) && (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedSections.includes(section._id) 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {selectedSections.includes(section._id) ? 'Selected' : 'Available'}
                </span>
                {isAuthorizedToUpload && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadClick(section._id);
                    }}
                    className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {selectedSections.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">{selectedSections.length}</span> section{selectedSections.length !== 1 ? 's' : ''} selected
              {selectedSections.length >= 5 && ' (maximum reached)'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderOverlapResult = () => {
    if (processing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Calculating overlap slots...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Calculation Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {error}
          </p>
          <Button 
            onClick={calculateOverlap} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (!overlapResult) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Results Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Select sections and click "Calculate Overlap" to find common free time slots
          </p>
        </div>
      );
    }

    const days = Object.keys(overlapResult);
    
    if (days.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Common Free Slots
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            No common free time slots found across the selected sections
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Common Free Slots
          </h3>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {days.length} day{days.length !== 1 ? 's' : ''} with overlap
          </span>
        </div>
        
        <div className="grid gap-4">
          {days.map((day) => (
            <div key={day} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {day}
              </h4>
              
              {overlapResult[day].length === 0 ? (
                <p className="text-gray-500 text-sm">No free slots available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {overlapResult[day].map((slot, index) => (
                    <div 
                      key={index} 
                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            {slot.start} - {slot.end}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Slot {index + 1}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Check if user is admin for admin-specific features
  const isAdmin = backendUser && (
    backendUser.role === 'ADMIN' || 
    backendUser.role === 'SUPER_ADMIN' || 
    (backendUser as any).permissions?.includes('MANAGE_USERS')
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Overlap Engine
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Find common free time slots across multiple sections
              </p>
            </div>
            
            {/* Admin Badge */}
            {isAdmin && (
              <div className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                <span className="font-semibold">ADMIN MODE</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Selection Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Sections
              </CardTitle>
              <p className="text-sm text-gray-500">
                Choose up to 5 sections to find common free slots
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                {renderSectionSelector()}
              </div>
              
              <Button
                onClick={calculateOverlap}
                disabled={selectedSections.length === 0 || processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Calculate Overlap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Overlap Results
              </CardTitle>
              <p className="text-sm text-gray-500">
                Common free time slots across selected sections
              </p>
            </CardHeader>
            <CardContent>
              {renderOverlapResult()}
            </CardContent>
          </Card>
        </div>
        
        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Users className="h-5 w-5" />
                  Administrative Functions
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Admin-specific tools and management options
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Section Management</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      As an administrator, you have full access to manage all sections and their timetables.
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      <li>• Upload timetables for any section</li>
                      <li>• View all section data</li>
                      <li>• Manage section representatives</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">System Overview</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Access to system-wide data and analytics for your organization.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <UploadTimetableModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        sectionId={currentSectionId || undefined}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default OverlapEnginePage;