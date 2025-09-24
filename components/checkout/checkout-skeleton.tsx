export function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Skeleton */}
      <div className="lg:col-span-2 space-y-6">
        {/* Steps Skeleton */}
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="ml-2 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              {step < 3 && (
                <div className="mx-4 h-px w-16 bg-gray-200 animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Form Fields Skeleton */}
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/4"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/5"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons Skeleton */}
        <div className="flex justify-between pt-6">
          <div className="h-12 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Order Summary Skeleton */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
          
          {/* Items Skeleton */}
          <div className="space-y-4 mb-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          
          {/* Summary Lines Skeleton */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-12"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex justify-between border-t pt-3">
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          
          {/* Button Skeleton */}
          <div className="mt-6">
            <div className="h-12 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}