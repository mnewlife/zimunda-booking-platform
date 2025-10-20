import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Users,
  MapPin,
  Star,
  Calendar,
  Shield,
  Camera,
  Mountain,
  Binoculars,
  TrendingUp,
  Heart,
  Share2,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import prisma from '@/lib/prisma';

// Get activity by ID from database
const getActivity = async (id: string) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
                date: {
                  gte: new Date(),
                },
              },
            },
          },
        },
      },
    });

    if (!activity) {
      return null;
    }

    return {
      ...activity,
      price: Number(activity.price),
    };
  } catch (error) {
    console.error('Error fetching activity:', error);
    return null;
  }
};

const getSimilarActivities = async (currentActivityId: string, type: string) => {
  // Mock similar activities
  return [
    {
      id: '2',
      slug: 'mountain-hiking-adventure',
      title: 'Mountain Hiking Adventure',
      type: 'hiking',
      difficulty: 'moderate',
      duration: 6,
      price: 65,
      rating: 4.7,
      image: '/images/activities/hiking-1.jpg',
    },
    {
      id: '3',
      slug: 'photography-workshop',
      title: 'Wildlife Photography Workshop',
      type: 'photography',
      difficulty: 'easy',
      duration: 3,
      price: 95,
      rating: 4.8,
      image: '/images/activities/photo-1.jpg',
    },
  ];
};

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivity(slug);
  
  if (!activity) {
    return {
      title: 'Activity Not Found | Zimunda Estate',
    };
  }

  return {
    title: `${activity.name} | Zimunda Estate Activities`,
    description: activity.description,
    openGraph: {
      title: activity.name,
      description: activity.description,
    },
  };
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'wildlife':
      return <Binoculars className="h-4 w-4" />;
    case 'hiking':
      return <Mountain className="h-4 w-4" />;
    case 'photography':
      return <Camera className="h-4 w-4" />;
    case 'adventure':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Star className="h-4 w-4" />;
  }
};

const formatAvailability = (availability: any) => {
  if (typeof availability === 'string') {
    return availability;
  }
  
  if (typeof availability === 'object' && availability !== null) {
    const { days, times, blackoutDates } = availability;
    let formatted = '';
    
    if (days && Array.isArray(days)) {
      const dayNames = days.map((day: string) => 
        day.charAt(0).toUpperCase() + day.slice(1)
      ).join(', ');
      formatted += `Available on: ${dayNames}\n`;
    }
    
    if (times && Array.isArray(times)) {
      formatted += `Available times: ${times.join(', ')}\n`;
    }
    
    if (blackoutDates && Array.isArray(blackoutDates) && blackoutDates.length > 0) {
      formatted += `Blackout dates: ${blackoutDates.join(', ')}`;
    } else {
      formatted += 'No blackout dates';
    }
    
    return formatted.trim();
  }
  
  return 'Availability information not available';
};

export default async function ActivityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const activity = await getActivity(slug);
  
  if (!activity) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/activities"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Activities
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  {getTypeIcon(activity.type)}
                  <span className="capitalize">{activity.type}</span>
                </Badge>
                <Badge variant="outline">
                  Capacity: {activity.capacity}
                </Badge>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activity.name}
              </h1>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{activity.duration} hours</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Max {activity.capacity} people</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  ${activity.price}
                </div>
                <div className="text-sm text-gray-600">per person</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Info */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Type</h3>
                    <p className="text-gray-700 capitalize">{activity.type}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Duration</h3>
                    <p className="text-gray-700">{activity.duration} hours</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Capacity</h3>
                    <p className="text-gray-700">Up to {activity.capacity} participants</p>
                  </div>
                  {activity.requirements && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                      <p className="text-gray-700">{activity.requirements}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {activity.description}
                </p>
              </CardContent>
            </Card>

            {/* Availability */}
            {activity.availability && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Availability</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700 whitespace-pre-line">
                    {formatAvailability(activity.availability)}
                  </div>
                </CardContent>
              </Card>
            )}


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-center">
                  <span className="text-2xl font-bold text-blue-600">
                    ${activity.price}
                  </span>
                  <span className="text-gray-600 ml-2">per person</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                >
                  Book Now
                </Button>
                
                <div className="text-center text-sm text-gray-600">
                  Free cancellation up to 24 hours
                </div>
                
                <Separator />
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{activity.duration} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max participants:</span>
                    <span className="font-medium">{activity.capacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{activity.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </div>
  );
}