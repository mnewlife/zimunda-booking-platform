import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

// Simple password hashing function for seeding
function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'zimunda_salt').digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminPassword = hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zimunda.com' },
    update: {},
    create: {
      id: 'user_admin',
      email: 'admin@zimunda.com',
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      phone: '+263777123456',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create Account for admin
  await prisma.account.upsert({
    where: { id: 'account_admin' },
    update: {},
    create: {
      id: 'account_admin',
      accountId: 'admin_credentials',
      providerId: 'credentials',
      userId: admin.id,
      password: adminPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create staff user
  const staffPassword = hashPassword('staff123');
  const staff = await prisma.user.upsert({
    where: { email: 'staff@zimunda.com' },
    update: {},
    create: {
      id: 'user_staff',
      email: 'staff@zimunda.com',
      name: 'Staff Member',
      role: 'STAFF',
      emailVerified: true,
      phone: '+263777654321',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create Account for staff
  await prisma.account.upsert({
    where: { id: 'account_staff' },
    update: {},
    create: {
      id: 'account_staff',
      accountId: 'staff_credentials',
      providerId: 'credentials',
      userId: staff.id,
      password: staffPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create sample guest users
  const guestPassword = hashPassword('guest123');
  const guest1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      id: 'user_guest1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'GUEST',
      emailVerified: true,
      phone: '+263777111222',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create Account for guest1
  await prisma.account.upsert({
    where: { id: 'account_guest1' },
    update: {},
    create: {
      id: 'account_guest1',
      accountId: 'guest1_credentials',
      providerId: 'credentials',
      userId: guest1.id,
      password: guestPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const guest2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      id: 'user_guest2',
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      role: 'GUEST',
      emailVerified: true,
      phone: '+263777333444',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create Account for guest2
  await prisma.account.upsert({
    where: { id: 'account_guest2' },
    update: {},
    create: {
      id: 'account_guest2',
      accountId: 'guest2_credentials',
      providerId: 'credentials',
      userId: guest2.id,
      password: guestPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('🏠 Creating amenities...');
  // Create amenities
  const amenities = await Promise.all([
    prisma.amenity.upsert({
      where: { name: 'WiFi' },
      update: {},
      create: { name: 'WiFi', icon: 'wifi', isGlobal: true }
    }),
    prisma.amenity.upsert({
      where: { name: 'Parking' },
      update: {},
      create: { name: 'Parking', icon: 'car', isGlobal: true }
    }),
    prisma.amenity.upsert({
      where: { name: 'Swimming Pool' },
      update: {},
      create: { name: 'Swimming Pool', icon: 'waves', isGlobal: true }
    }),
    prisma.amenity.upsert({
      where: { name: 'Restaurant' },
      update: {},
      create: { name: 'Restaurant', icon: 'utensils-crossed', isGlobal: true }
    }),
    prisma.amenity.upsert({
      where: { name: 'Fireplace' },
      update: {},
      create: { name: 'Fireplace', icon: 'flame', isGlobal: false }
    }),
    prisma.amenity.upsert({
      where: { name: 'Kitchen' },
      update: {},
      create: { name: 'Kitchen', icon: 'refrigerator', isGlobal: false }
    }),
    prisma.amenity.upsert({
      where: { name: 'BBQ/Braai' },
      update: {},
      create: { name: 'BBQ/Braai', icon: 'grill', isGlobal: false }
    }),
    prisma.amenity.upsert({
      where: { name: 'Mountain View' },
      update: {},
      create: { name: 'Mountain View', icon: 'mountain', isGlobal: false }
    }),
    prisma.amenity.upsert({
      where: { name: 'Air Conditioning' },
      update: {},
      create: { name: 'Air Conditioning', icon: 'air-vent', isGlobal: false }
    }),
    prisma.amenity.upsert({
      where: { name: 'Hot Tub' },
      update: {},
      create: { name: 'Hot Tub', icon: 'bath', isGlobal: false }
    })
  ]);

  console.log('🏡 Creating properties...');
  // Create properties
  const mountainViewCottage = await prisma.property.upsert({
    where: { slug: 'mountain-view-cottage' },
    update: {},
    create: {
      name: 'Mountain View Cottage',
      type: 'COTTAGE',
      slug: 'mountain-view-cottage',
      description: 'Spacious cottage with panoramic views of the Vumba mountains. Features a fully equipped kitchen, fireplace, and outdoor braai area. Perfect for families and groups seeking comfort and stunning scenery.',
      maxOccupancy: 6,
      basePrice: 150,
      status: 'ACTIVE',
      rules: [
        'No smoking inside the cottage',
        'No pets allowed',
        'Quiet hours from 10 PM to 7 AM',
        'Maximum occupancy strictly enforced',
        'Check-in: 2 PM, Check-out: 11 AM'
      ],
      policies: {
        cancellation: 'Free cancellation up to 48 hours before check-in',
        deposit: '50% deposit required to confirm booking',
        cleaning: 'Professional cleaning fee included',
        damage: 'Guests are responsible for any damages'
      },
      location: {
        coordinates: { lat: -18.9391, lng: 32.6877 },
        address: 'Vumba Mountains, Mutare, Zimbabwe',
        directions: 'Take the Vumba Road from Mutare, follow signs to Zimunda Estate'
      }
    }
  });

  const forestHavenCabin = await prisma.property.upsert({
    where: { slug: 'forest-haven-cabin' },
    update: {},
    create: {
      name: 'Forest Haven Cabin',
      type: 'CABIN',
      slug: 'forest-haven-cabin',
      description: 'Cozy cabin nestled in the indigenous forest. Perfect for couples seeking a romantic getaway with nature sounds and forest views. Features a private deck and outdoor shower.',
      maxOccupancy: 2,
      basePrice: 100,
      status: 'ACTIVE',
      rules: [
        'Adults only (18+)',
        'No smoking anywhere on property',
        'Respect wildlife and forest environment',
        'No loud music or parties',
        'Check-in: 3 PM, Check-out: 11 AM'
      ],
      policies: {
        cancellation: 'Free cancellation up to 24 hours before check-in',
        deposit: '30% deposit required to confirm booking',
        cleaning: 'Eco-friendly cleaning practices',
        damage: 'Environmental damage will incur additional charges'
      },
      location: {
        coordinates: { lat: -18.9401, lng: 32.6887 },
        address: 'Forest Section, Zimunda Estate, Vumba',
        directions: 'Follow forest trail markers from main reception'
      }
    }
  });

  const sunsetRidgeCottage = await prisma.property.upsert({
    where: { slug: 'sunset-ridge-cottage' },
    update: {},
    create: {
      name: 'Sunset Ridge Cottage',
      type: 'COTTAGE',
      slug: 'sunset-ridge-cottage',
      description: 'Family-friendly cottage with stunning sunset views over the valley. Large deck area, children\'s play zone, and spacious living areas. Ideal for multi-generational families.',
      maxOccupancy: 8,
      basePrice: 200,
      status: 'ACTIVE',
      rules: [
        'Children must be supervised at all times',
        'No smoking inside the cottage',
        'Pets allowed with prior approval',
        'Quiet hours from 9 PM to 8 AM',
        'Check-in: 2 PM, Check-out: 12 PM'
      ],
      policies: {
        cancellation: 'Free cancellation up to 72 hours before check-in',
        deposit: '40% deposit required to confirm booking',
        cleaning: 'Deep cleaning fee for extended stays',
        damage: 'Security deposit required for groups with children'
      },
      location: {
        coordinates: { lat: -18.9381, lng: 32.6897 },
        address: 'Sunset Ridge, Zimunda Estate, Vumba',
        directions: 'Take the ridge road from main gate, follow sunset signs'
      }
    }
  });

  console.log('🖼️ Adding property images...');
  // Add images for properties
  await prisma.image.createMany({
    data: [
      // Mountain View Cottage images
      {
        url: 'https://example.com/images/properties/mountain-view-cottage/exterior-1.jpg',
        alt: 'Mountain View Cottage exterior with mountain backdrop',
        caption: 'Stunning mountain views from the cottage',
        order: 1,
        propertyId: mountainViewCottage.id
      },
      {
        url: 'https://example.com/images/properties/mountain-view-cottage/living-room.jpg',
        alt: 'Spacious living room with fireplace',
        caption: 'Cozy living area with mountain views',
        order: 2,
        propertyId: mountainViewCottage.id
      },
      {
        url: 'https://example.com/images/properties/mountain-view-cottage/kitchen.jpg',
        alt: 'Fully equipped modern kitchen',
        caption: 'Everything you need for home cooking',
        order: 3,
        propertyId: mountainViewCottage.id
      },
      {
        url: 'https://example.com/images/properties/mountain-view-cottage/bedroom-master.jpg',
        alt: 'Master bedroom with mountain views',
        caption: 'Wake up to breathtaking mountain scenery',
        order: 4,
        propertyId: mountainViewCottage.id
      },
      {
        url: 'https://example.com/images/properties/mountain-view-cottage/deck.jpg',
        alt: 'Large outdoor deck with braai area',
        caption: 'Perfect for outdoor dining and relaxation',
        order: 5,
        propertyId: mountainViewCottage.id
      },
      // Forest Haven Cabin images
      {
        url: 'https://example.com/images/properties/forest-haven-cabin/exterior-1.jpg',
        alt: 'Forest Haven Cabin surrounded by indigenous trees',
        caption: 'Your private forest retreat',
        order: 1,
        propertyId: forestHavenCabin.id
      },
      {
        url: 'https://example.com/images/properties/forest-haven-cabin/bedroom.jpg',
        alt: 'Romantic bedroom with forest views',
        caption: 'Fall asleep to the sounds of nature',
        order: 2,
        propertyId: forestHavenCabin.id
      },
      {
        url: 'https://example.com/images/properties/forest-haven-cabin/deck.jpg',
        alt: 'Private deck overlooking the forest',
        caption: 'Your own piece of paradise',
        order: 3,
        propertyId: forestHavenCabin.id
      },
      {
        url: 'https://example.com/images/properties/forest-haven-cabin/bathroom.jpg',
        alt: 'Outdoor shower with forest privacy',
        caption: 'Unique outdoor bathing experience',
        order: 4,
        propertyId: forestHavenCabin.id
      },
      // Sunset Ridge Cottage images
      {
        url: 'https://example.com/images/properties/sunset-ridge-cottage/exterior-sunset.jpg',
        alt: 'Sunset Ridge Cottage during golden hour',
        caption: 'Experience magical sunsets every evening',
        order: 1,
        propertyId: sunsetRidgeCottage.id
      },
      {
        url: 'https://example.com/images/properties/sunset-ridge-cottage/living-area.jpg',
        alt: 'Large family living area',
        caption: 'Plenty of space for the whole family',
        order: 2,
        propertyId: sunsetRidgeCottage.id
      },
      {
        url: 'https://example.com/images/properties/sunset-ridge-cottage/kids-room.jpg',
        alt: 'Colorful children\'s bedroom',
        caption: 'Kids will love their special space',
        order: 3,
        propertyId: sunsetRidgeCottage.id
      },
      {
        url: 'https://example.com/images/properties/sunset-ridge-cottage/play-area.jpg',
        alt: 'Outdoor children\'s play area',
        caption: 'Safe outdoor fun for children',
        order: 4,
        propertyId: sunsetRidgeCottage.id
      },
      {
        url: 'https://example.com/images/properties/sunset-ridge-cottage/sunset-view.jpg',
        alt: 'Spectacular sunset view from the cottage',
        caption: 'Unforgettable sunset experiences',
        order: 5,
        propertyId: sunsetRidgeCottage.id
      }
    ]
  });

  console.log('🔗 Linking property amenities...');
  // Link amenities to properties
  const wifiAmenity = amenities.find(a => a.name === 'WiFi')!;
  const parkingAmenity = amenities.find(a => a.name === 'Parking')!;
  const poolAmenity = amenities.find(a => a.name === 'Swimming Pool')!;
  const restaurantAmenity = amenities.find(a => a.name === 'Restaurant')!;
  const fireplaceAmenity = amenities.find(a => a.name === 'Fireplace')!;
  const kitchenAmenity = amenities.find(a => a.name === 'Kitchen')!;
  const braaiAmenity = amenities.find(a => a.name === 'BBQ/Braai')!;
  const mountainViewAmenity = amenities.find(a => a.name === 'Mountain View')!;
  const acAmenity = amenities.find(a => a.name === 'Air Conditioning')!;
  const hotTubAmenity = amenities.find(a => a.name === 'Hot Tub')!;

  // Mountain View Cottage amenities
  await prisma.propertyAmenity.createMany({
    data: [
      { propertyId: mountainViewCottage.id, amenityId: wifiAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: parkingAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: poolAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: restaurantAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: fireplaceAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: kitchenAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: braaiAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: mountainViewAmenity.id },
      { propertyId: mountainViewCottage.id, amenityId: acAmenity.id }
    ],
    skipDuplicates: true
  });

  // Forest Haven Cabin amenities
  await prisma.propertyAmenity.createMany({
    data: [
      { propertyId: forestHavenCabin.id, amenityId: wifiAmenity.id },
      { propertyId: forestHavenCabin.id, amenityId: parkingAmenity.id },
      { propertyId: forestHavenCabin.id, amenityId: poolAmenity.id },
      { propertyId: forestHavenCabin.id, amenityId: restaurantAmenity.id },
      { propertyId: forestHavenCabin.id, amenityId: hotTubAmenity.id }
    ],
    skipDuplicates: true
  });

  // Sunset Ridge Cottage amenities
  await prisma.propertyAmenity.createMany({
    data: [
      { propertyId: sunsetRidgeCottage.id, amenityId: wifiAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: parkingAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: poolAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: restaurantAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: fireplaceAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: kitchenAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: braaiAmenity.id },
      { propertyId: sunsetRidgeCottage.id, amenityId: acAmenity.id }
    ],
    skipDuplicates: true
  });

  console.log('🎯 Creating activities...');
  // Create activities
  const coffeeTour = await prisma.activity.upsert({
    where: { name: 'Coffee Farm Tour' },
    update: {},
    create: {
      name: 'Coffee Farm Tour',
      slug: 'coffee-farm-tour',
      type: 'COFFEE_TOUR',
      description: 'Guided tour of our coffee plantation with tasting session. Learn about the coffee growing process from bean to cup, including harvesting, processing, and roasting techniques.',
      duration: 120, // 2 hours
      price: 25,
      capacity: 15,
      maxParticipants: 15,
      location: 'Coffee Plantation',
      bookable: true,
      requirements: [
        'Comfortable walking shoes required',
        'Hat and sunscreen recommended',
        'Minimum age: 8 years',
        'Tours run rain or shine'
      ],
      availability: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        times: ['09:00', '14:00'],
        blackoutDates: []
      }
    }
  });

  const poolBooking = await prisma.activity.upsert({
    where: { name: 'Swimming Pool (Exclusive Use)' },
    update: {},
    create: {
      name: 'Swimming Pool (Exclusive Use)',
      slug: 'swimming-pool-exclusive',
      type: 'POOL_BOOKING',
      description: 'Book the pool area exclusively for your group. Includes pool access, loungers, and poolside service. Perfect for private parties and family gatherings.',
      duration: 60,
      price: 50,
      capacity: 20,
      maxParticipants: 20,
      location: 'Pool Area',
      bookable: true,
      requirements: [
        'Swimming at own risk',
        'Children must be supervised',
        'No glass containers in pool area',
        'Advance booking required'
      ],
      availability: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        times: ['08:00', '10:00', '12:00', '14:00', '16:00'],
        blackoutDates: []
      }
    }
  });

  const hiking = await prisma.activity.upsert({
    where: { name: 'Guided Nature Hike' },
    update: {},
    create: {
      name: 'Guided Nature Hike',
      slug: 'guided-nature-hike',
      type: 'HIKING',
      description: 'Explore the beautiful Vumba mountains with our experienced guide. Discover local flora, fauna, and breathtaking viewpoints. Suitable for all fitness levels.',
      duration: 180, // 3 hours
      price: 35,
      capacity: 8,
      maxParticipants: 8,
      location: 'Vumba Mountains',
      bookable: true,
      requirements: [
        'Good walking shoes essential',
        'Water bottle provided',
        'Minimum age: 12 years',
        'Moderate fitness level required'
      ],
      availability: {
        days: ['tuesday', 'thursday', 'saturday', 'sunday'],
        times: ['07:00', '15:00'],
        blackoutDates: []
      }
    }
  });

  const birdWatching = await prisma.activity.upsert({
    where: { name: 'Bird Watching Tour' },
    update: {},
    create: {
      name: 'Bird Watching Tour',
      slug: 'bird-watching-tour',
      type: 'BIRD_WATCHING',
      description: 'Early morning bird watching tour with expert ornithologist. Spot endemic species and learn about local bird life. Binoculars and field guide provided.',
      duration: 150, // 2.5 hours
      price: 30,
      capacity: 6,
      maxParticipants: 6,
      location: 'Estate Grounds',
      bookable: true,
      requirements: [
        'Early start (6 AM)',
        'Quiet observation required',
        'Suitable for all ages',
        'Weather dependent'
      ],
      availability: {
        days: ['wednesday', 'friday', 'saturday', 'sunday'],
        times: ['06:00'],
        blackoutDates: []
      }
    }
  });

  console.log('🛍️ Creating products...');
  // Create coffee products
  const mediumRoastCoffee = await prisma.product.upsert({
    where: { name: 'Zimunda Estate Coffee - Medium Roast' },
    update: {},
    create: {
      name: 'Zimunda Estate Coffee - Medium Roast',
      category: 'COFFEE',
      description: 'Our signature medium roast coffee beans from the Vumba highlands. Smooth, balanced flavor with notes of chocolate and citrus. Perfect for any brewing method.',
      price: 15,
      inventory: 100
    }
  });

  const darkRoastCoffee = await prisma.product.upsert({
    where: { name: 'Zimunda Estate Coffee - Dark Roast' },
    update: {},
    create: {
      name: 'Zimunda Estate Coffee - Dark Roast',
      category: 'COFFEE',
      description: 'Rich, bold dark roast perfect for espresso. Full-bodied with smoky undertones and a robust finish. Ideal for coffee enthusiasts who love intensity.',
      price: 15,
      inventory: 100
    }
  });

  const lightRoastCoffee = await prisma.product.upsert({
    where: { name: 'Zimunda Estate Coffee - Light Roast' },
    update: {},
    create: {
      name: 'Zimunda Estate Coffee - Light Roast',
      category: 'COFFEE',
      description: 'Bright and fruity light roast showcasing the unique terroir of the Vumba mountains. Floral notes with a clean, crisp finish.',
      price: 15,
      inventory: 100
    }
  });

  const coffeeMug = await prisma.product.upsert({
    where: { name: 'Zimunda Estate Coffee Mug' },
    update: {},
    create: {
      name: 'Zimunda Estate Coffee Mug',
      category: 'MERCHANDISE',
      description: 'Beautiful ceramic mug featuring the Zimunda Estate logo and mountain design. Perfect for enjoying your morning coffee while remembering your stay.',
      price: 12,
      inventory: 50
    }
  });

  const tShirt = await prisma.product.upsert({
    where: { name: 'Zimunda Estate T-Shirt' },
    update: {},
    create: {
      name: 'Zimunda Estate T-Shirt',
      category: 'MERCHANDISE',
      description: 'Comfortable cotton t-shirt with Zimunda Estate branding. Available in multiple sizes and colors. A perfect souvenir from your mountain getaway.',
      price: 20,
      inventory: 75
    }
  });

  console.log('📦 Creating product variants...');
  // Create product variants
  await prisma.productVariant.createMany({
    data: [
      // Medium Roast variants
      {
        productId: mediumRoastCoffee.id,
        name: '250g Ground',
        price: 15,
        inventory: 50,
        sku: 'ZE-MR-250G',
        options: { size: '250g', grind: 'ground', roast: 'medium' }
      },
      {
        productId: mediumRoastCoffee.id,
        name: '250g Beans',
        price: 15,
        inventory: 50,
        sku: 'ZE-MR-250B',
        options: { size: '250g', grind: 'beans', roast: 'medium' }
      },
      {
        productId: mediumRoastCoffee.id,
        name: '500g Ground',
        price: 28,
        inventory: 30,
        sku: 'ZE-MR-500G',
        options: { size: '500g', grind: 'ground', roast: 'medium' }
      },
      {
        productId: mediumRoastCoffee.id,
        name: '500g Beans',
        price: 28,
        inventory: 30,
        sku: 'ZE-MR-500B',
        options: { size: '500g', grind: 'beans', roast: 'medium' }
      },
      // Dark Roast variants
      {
        productId: darkRoastCoffee.id,
        name: '250g Ground',
        price: 15,
        inventory: 40,
        sku: 'ZE-DR-250G',
        options: { size: '250g', grind: 'ground', roast: 'dark' }
      },
      {
        productId: darkRoastCoffee.id,
        name: '250g Beans',
        price: 15,
        inventory: 40,
        sku: 'ZE-DR-250B',
        options: { size: '250g', grind: 'beans', roast: 'dark' }
      },
      {
        productId: darkRoastCoffee.id,
        name: '500g Ground',
        price: 28,
        inventory: 25,
        sku: 'ZE-DR-500G',
        options: { size: '500g', grind: 'ground', roast: 'dark' }
      },
      {
        productId: darkRoastCoffee.id,
        name: '500g Beans',
        price: 28,
        inventory: 25,
        sku: 'ZE-DR-500B',
        options: { size: '500g', grind: 'beans', roast: 'dark' }
      },
      // Light Roast variants
      {
        productId: lightRoastCoffee.id,
        name: '250g Ground',
        price: 15,
        inventory: 35,
        sku: 'ZE-LR-250G',
        options: { size: '250g', grind: 'ground', roast: 'light' }
      },
      {
        productId: lightRoastCoffee.id,
        name: '250g Beans',
        price: 15,
        inventory: 35,
        sku: 'ZE-LR-250B',
        options: { size: '250g', grind: 'beans', roast: 'light' }
      },
      // T-Shirt variants
      {
        productId: tShirt.id,
        name: 'Small - White',
        price: 20,
        inventory: 15,
        sku: 'ZE-TS-S-W',
        options: { size: 'S', color: 'white' }
      },
      {
        productId: tShirt.id,
        name: 'Medium - White',
        price: 20,
        inventory: 20,
        sku: 'ZE-TS-M-W',
        options: { size: 'M', color: 'white' }
      },
      {
        productId: tShirt.id,
        name: 'Large - White',
        price: 20,
        inventory: 20,
        sku: 'ZE-TS-L-W',
        options: { size: 'L', color: 'white' }
      },
      {
        productId: tShirt.id,
        name: 'Medium - Green',
        price: 20,
        inventory: 20,
        sku: 'ZE-TS-M-G',
        options: { size: 'M', color: 'green' }
      }
    ],
    skipDuplicates: true
  });

  console.log('🎁 Creating add-ons...');
  // Create add-ons
  await prisma.addOn.createMany({
    data: [
      {
        name: 'Airport Transfer',
        description: 'Round-trip transfer from Mutare Airport to Zimunda Estate',
        price: 80,
        isGlobal: true
      },
      {
        name: 'Firewood Bundle',
        description: 'Bundle of seasoned firewood for your fireplace',
        price: 15,
        isGlobal: false,
        propertyId: mountainViewCottage.id
      },
      {
        name: 'Firewood Bundle',
        description: 'Bundle of seasoned firewood for your fireplace',
        price: 15,
        isGlobal: false,
        propertyId: sunsetRidgeCottage.id
      },
      {
        name: 'Welcome Basket',
        description: 'Basket with local snacks, coffee, and fresh fruit',
        price: 25,
        isGlobal: true
      },
      {
        name: 'Late Check-out',
        description: 'Extend your stay until 3 PM (subject to availability)',
        price: 30,
        isGlobal: true
      },
      {
        name: 'Early Check-in',
        description: 'Check in from 12 PM (subject to availability)',
        price: 25,
        isGlobal: true
      },
      {
        name: 'Romantic Package',
        description: 'Champagne, chocolates, and rose petals for special occasions',
        price: 45,
        isGlobal: false,
        propertyId: forestHavenCabin.id
      },
      {
        name: 'Kids Activity Pack',
        description: 'Games, coloring books, and outdoor toys for children',
        price: 20,
        isGlobal: false,
        propertyId: sunsetRidgeCottage.id
      }
    ],
    skipDuplicates: true
  });

  console.log('⚙️ Creating system settings...');
  // Create system settings
  await prisma.settings.createMany({
    data: [
      {
        key: 'pricing.serviceFeeRate',
        value: '0.10',
        description: 'Service fee rate (10%)',
        category: 'pricing',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'pricing.taxRate',
        value: '0.15',
        description: 'Tax rate (15%)',
        category: 'pricing',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'property.defaultRating',
        value: '4.5',
        description: 'Default property rating',
        category: 'property',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'pricing.currency',
        value: 'USD',
        description: 'Default currency',
        category: 'pricing',
        dataType: 'string',
        isEditable: true
      },
      {
        key: 'booking.minimumStay',
        value: '1',
        description: 'Minimum stay in nights',
        category: 'booking',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'site.name',
        value: 'Zimunda Estate',
        description: 'Site name',
        category: 'general',
        dataType: 'string',
        isEditable: true
      },
      {
        key: 'contact.email',
        value: 'info@zimunda.com',
        description: 'Contact email',
        category: 'contact',
        dataType: 'string',
        isEditable: true
      },
      {
        key: 'contact.phone',
        value: '+263777123456',
        description: 'Contact phone number',
        category: 'contact',
        dataType: 'string',
        isEditable: true
      }
    ],
    skipDuplicates: true
  });

  console.log('📅 Creating sample bookings...');
  // Create sample bookings
  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 30);
  const futureDate2 = new Date(futureDate1);
  futureDate2.setDate(futureDate2.getDate() + 3);

  const futureDate3 = new Date();
  futureDate3.setDate(futureDate3.getDate() + 45);
  const futureDate4 = new Date(futureDate3);
  futureDate4.setDate(futureDate4.getDate() + 2);

  await prisma.booking.createMany({
    data: [
      {
        propertyId: mountainViewCottage.id,
        guestId: guest1.id,
        checkIn: futureDate1,
        checkOut: futureDate2,
        adults: 4,
        children: 2,
        totalPrice: 450, // 3 nights * $150
        status: 'CONFIRMED',
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
        notes: 'Celebrating wedding anniversary'
      },
      {
        propertyId: forestHavenCabin.id,
        guestId: guest2.id,
        checkIn: futureDate3,
        checkOut: futureDate4,
        adults: 2,
        children: 0,
        totalPrice: 200, // 2 nights * $100
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PENDING',
        notes: 'Honeymoon trip'
      }
    ],
    skipDuplicates: true
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('- Users: 4 (1 admin, 1 staff, 2 guests)');
  console.log('- Properties: 3 (2 cottages, 1 cabin)');
  console.log('- Amenities: 10');
  console.log('- Activities: 4');
  console.log('- Products: 5 with variants');
  console.log('- Add-ons: 8');
  console.log('- Settings: 8 (pricing, property, contact)');
  console.log('- Sample bookings: 2');
  console.log('\n🔐 Login credentials:');
  console.log('Admin: admin@zimunda.com / admin123');
  console.log('Staff: staff@zimunda.com / staff123');
  console.log('Guest: john.doe@example.com / guest123');
  console.log('Guest: jane.smith@example.com / guest123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });