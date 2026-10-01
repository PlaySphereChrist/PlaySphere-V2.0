const { pool, query } = require('../src/config/database');

const GROUNDS_DATA = [
  // --- Bangalore (10) ---
  {
    name: 'Play Arena Sports Complex',
    description: 'Premier multi-sports venue featuring artificial turf football pitches, professional badminton courts, and floodlit basketball courts with spectator viewing decks.',
    address: 'Silverwood Regency Apartments, Sarjapur Main Rd, Kasavanahalli',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.908100,
    longitude: 77.674400,
    contact_phone: '+91 9845012345',
    contact_email: 'sarjapur@playarena.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Parking', 'Cafeteria', 'First Aid', 'Locker Room', 'Pro Shop', 'Wi-Fi'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1400 },
      { name: 'Badminton', surface_type: 'Synthetic Mat', capacity: 40, price: 450 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 60, price: 900 }
    ]
  },
  {
    name: 'Kanteerava Multi-Sport Arena',
    description: 'Historic city-center sports arena with well-maintained natural grass grounds and indoor wooden basketball pavilions. Ideal for competitive matches and training.',
    address: 'Kasturba Rd, Sampangi Rama Nagar',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.969800,
    longitude: 77.592600,
    contact_phone: '+91 9845023456',
    contact_email: 'kanteerava@playsphere.local',
    amenities: ['Floodlights', 'Seating Gallery', 'Locker Room', 'Washrooms', 'Parking', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 500, price: 1600 },
      { name: 'Basketball', surface_type: 'Maple Wood Court', capacity: 200, price: 1200 },
      { name: 'Volleyball', surface_type: 'Hard Court', capacity: 100, price: 800 }
    ]
  },
  {
    name: 'FSV Arena Hennur',
    description: 'FIFA-standard artificial football turf arena with high-density monofilament fibers and low-glare LED illumination, popular for corporate leagues.',
    address: 'Hennur Bagalur Main Rd, Chikkagubbi',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 13.068200,
    longitude: 77.653400,
    contact_phone: '+91 9845034567',
    contact_email: 'hennur@fsvarena.com',
    amenities: ['Floodlights', 'Parking', 'Changing Rooms', 'Cafeteria', 'Shower Facility'],
    sports: [
      { name: 'Football', surface_type: 'FIFA-certified Artificial Turf', capacity: 150, price: 1500 }
    ]
  },
  {
    name: 'Active Arena Marathahalli',
    description: 'Extensive sports destination equipped for both 7-a-side football, enclosed box cricket turf pitches, and indoor badminton courts with ample parking.',
    address: 'Opposite Prestige Tech Park, Outer Ring Rd, Kadubeesanahalli',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.936600,
    longitude: 77.696100,
    contact_phone: '+91 9845045678',
    contact_email: 'marathahalli@activearena.in',
    amenities: ['Floodlights', 'Parking', 'Water Cooler', 'Washrooms', 'Equipment Rental', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket Turf', capacity: 60, price: 1100 },
      { name: 'Badminton', surface_type: 'Synthetic Mats', capacity: 40, price: 500 }
    ]
  },
  {
    name: 'Decathlon Anubhava Sports Hub',
    description: 'Comprehensive sports facility offering outdoor football, multi-court basketball, and dedicated volleyball courts with Decathlon certified sports equipment.',
    address: 'Survey No 78/10, Bellary Rd, Chikkajala',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 13.175200,
    longitude: 77.634100,
    contact_phone: '+91 9845056789',
    contact_email: 'anubhava@decathlon.in',
    amenities: ['Parking', 'Washrooms', 'Changing Rooms', 'Pro Shop', 'First Aid', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 90, price: 1000 },
      { name: 'Basketball', surface_type: 'Outdoor Acrylic', capacity: 50, price: 750 },
      { name: 'Volleyball', surface_type: 'Sand Court', capacity: 40, price: 650 }
    ]
  },
  {
    name: 'Tiento Sports Arena Richmond Town',
    description: 'Centrally located rooftop turf tailored for fast-paced 5-a-side football and basketball under modern perimeter floodlights.',
    address: '64/2, Mission Rd, Shanthala Nagar, Richmond Town',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.959200,
    longitude: 77.597400,
    contact_phone: '+91 9845067890',
    contact_email: 'richmond@tientosports.com',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'Water Cooler', 'Locker Room'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1300 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 50, price: 850 }
    ]
  },
  {
    name: 'Dribble Arena Whitefield',
    description: 'Spacious suburban sports turf suited for corporate cricket leagues, weekend soccer tournaments, and coaching camps.',
    address: 'ECC Rd, Prasanth Extension, Whitefield',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.973400,
    longitude: 77.749200,
    contact_phone: '+91 9845078901',
    contact_email: 'whitefield@dribblearena.in',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'Changing Rooms', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1100 },
      { name: 'Cricket', surface_type: 'Box Cricket Turf', capacity: 80, price: 1100 }
    ]
  },
  {
    name: 'Powerplay Sports Center Hoodi',
    description: 'High-ceiling indoor complex featuring wooden badminton courts and outdoor astro-turf fields for box cricket and 5v5 soccer.',
    address: 'Seetharampalya, Hoodi, Whitefield',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.988100,
    longitude: 77.712300,
    contact_phone: '+91 9845089012',
    contact_email: 'hoodi@powerplaysports.com',
    amenities: ['Floodlights', 'First Aid', 'Parking', 'Washrooms', 'Locker Room'],
    sports: [
      { name: 'Cricket', surface_type: 'Box Turf Pitch', capacity: 60, price: 1000 },
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 40, price: 500 },
      { name: 'Football', surface_type: '5-a-side Turf', capacity: 50, price: 1100 }
    ]
  },
  {
    name: 'Kicks on Grass Bellandur',
    description: 'State-of-the-art dual football arena right behind Tech Parks. Fitted with imported shock-pad turf and full HD match recording cameras.',
    address: 'RMZ Ecospace Access Rd, Bellandur',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.926100,
    longitude: 77.683400,
    contact_phone: '+91 9845090123',
    contact_email: 'bellandur@kicksongrass.com',
    amenities: ['Floodlights', 'Changing Rooms', 'Cafeteria', 'Parking', 'Shower Facility', 'Wi-Fi'],
    sports: [
      { name: 'Football', surface_type: 'FIFA 2-Star Turf', capacity: 120, price: 1500 }
    ]
  },
  {
    name: 'Gamepoint HSR Arena',
    description: 'Premier indoor hub in HSR Layout offering BWF standard badminton courts, indoor basketball, and cushioned volleyball surfaces.',
    address: '19th Main Rd, Sector 1, HSR Layout',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.911800,
    longitude: 77.652100,
    contact_phone: '+91 9845101234',
    contact_email: 'hsr@gamepointindia.com',
    amenities: ['Locker Room', 'Shower Facility', 'Water Cooler', 'Parking', 'Air Conditioning'],
    sports: [
      { name: 'Badminton', surface_type: 'Synthetic Court', capacity: 50, price: 500 },
      { name: 'Basketball', surface_type: 'Indoor Court', capacity: 60, price: 1000 },
      { name: 'Volleyball', surface_type: 'Synthetic', capacity: 40, price: 800 }
    ]
  },

  // --- Mumbai & Navi Mumbai (8) ---
  {
    name: 'Kick Off Turf Bandra',
    description: 'Iconic Bandra sports venue overlooking the sea breeze, featuring high-spec monofilament astro turf for 6v6 football and night cricket.',
    address: "St. Dominic Rd, Bandra West",
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.055300,
    longitude: 72.829500,
    contact_phone: '+91 9820011223',
    contact_email: 'bandra@kickoffturf.com',
    amenities: ['Floodlights', 'Changing Rooms', 'Washrooms', 'First Aid', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 90, price: 1800 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1600 }
    ]
  },
  {
    name: 'Urban Sports Park Worli',
    description: 'Rooftop sports destination offering panoramic sea link views, pristine turf conditions, and an all-weather acrylic basketball court.',
    address: 'Dr. Annie Besant Rd, Worli',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.016200,
    longitude: 72.818400,
    contact_phone: '+91 9820022334',
    contact_email: 'worli@urbansports.in',
    amenities: ['Floodlights', 'Parking', 'Locker Room', 'Cafeteria', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1900 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 50, price: 1100 }
    ]
  },
  {
    name: 'The Base Malad',
    description: 'Popular North Mumbai football and cricket destination with extra clearance netting and seamless online booking support.',
    address: 'Malad Link Rd, Near Inorbit Mall, Malad West',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.176400,
    longitude: 72.836100,
    contact_phone: '+91 9820033445',
    contact_email: 'malad@thebase.in',
    amenities: ['Floodlights', 'Washrooms', 'Changing Rooms', 'Parking'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1500 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1400 }
    ]
  },
  {
    name: 'Astro Park Juhu',
    description: 'Lush seaside turf ground ideal for weekend recreational leagues, youth training academies, and beach volleyball sessions.',
    address: 'Vithalrao Vandekar Marg, Juhu Tara Rd, Juhu',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.098800,
    longitude: 72.826700,
    contact_phone: '+91 9820044556',
    contact_email: 'juhu@astropark.co.in',
    amenities: ['Floodlights', 'Parking', 'Water Cooler', 'First Aid', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Turf', capacity: 100, price: 1700 },
      { name: 'Volleyball', surface_type: 'Sand Court', capacity: 40, price: 800 }
    ]
  },
  {
    name: 'Champions Sports Turf Powai',
    description: 'Modern sports arena nestled in the hills of Powai, fully equipped with high-beam LED stadium lights and cushioned turf backing.',
    address: 'Hiranandani Gardens, Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.119700,
    longitude: 72.905600,
    contact_phone: '+91 9820055667',
    contact_email: 'powai@championsturf.com',
    amenities: ['Floodlights', 'Changing Rooms', 'Washrooms', 'Parking', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1400 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1300 }
    ]
  },
  {
    name: 'Dribble Turf Andheri',
    description: 'Centrally situated sports complex with double-netted enclosures, professional turf pitches, and indoor badminton courts.',
    address: 'Veera Desai Industrial Estate, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.135200,
    longitude: 72.831800,
    contact_phone: '+91 9820066778',
    contact_email: 'andheri@dribbleturf.com',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'Water Cooler', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1400 },
      { name: 'Badminton', surface_type: 'Synthetic Mats', capacity: 40, price: 550 }
    ]
  },
  {
    name: 'Nerul Gymkhana Sports Ground',
    description: 'Expansive multi-acre sports facility in Navi Mumbai hosting standard size cricket matches, football friendlies, and club tournaments.',
    address: 'Sector 28, Nerul West',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    latitude: 19.033000,
    longitude: 73.018200,
    contact_phone: '+91 9820077889',
    contact_email: 'nerul@gymkhana.in',
    amenities: ['Seating Gallery', 'Pavilion', 'Parking', 'Washrooms', 'Cafeteria', 'Locker Room'],
    sports: [
      { name: 'Cricket', surface_type: 'Natural Turf Ground', capacity: 800, price: 2200 },
      { name: 'Football', surface_type: 'Natural Grass Field', capacity: 400, price: 1800 }
    ]
  },
  {
    name: 'SMAAASH Sports Arena Lower Parel',
    description: 'High-energy sports arena in central Mumbai providing enclosed indoor soccer arenas and automated cricket bowling nets.',
    address: 'Gate 4, Kamala Mills Compound, Lower Parel',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 18.995300,
    longitude: 72.827200,
    contact_phone: '+91 9820088990',
    contact_email: 'lowerparel@smaaash.in',
    amenities: ['Air Conditioning', 'Cafeteria', 'Parking', 'First Aid', 'Pro Shop', 'Wi-Fi'],
    sports: [
      { name: 'Cricket', surface_type: 'Indoor Turf Pitch', capacity: 60, price: 1900 },
      { name: 'Football', surface_type: 'Indoor Turf Arena', capacity: 60, price: 1800 }
    ]
  },

  // --- Delhi NCR (8) ---
  {
    name: 'Siri Fort Sports Complex',
    description: 'Premier governmental sports enclave with top-tier badminton courts, Olympic-grade basketball courts, and lush grass soccer fields.',
    address: 'August Kranti Marg, Siri Fort',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.552100,
    longitude: 77.218400,
    contact_phone: '+91 9811012345',
    contact_email: 'sirifort@dda.gov.in',
    amenities: ['Floodlights', 'Seating Gallery', 'Locker Room', 'Cafeteria', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 200, price: 500 },
      { name: 'Basketball', surface_type: 'Synthetic Court', capacity: 150, price: 800 },
      { name: 'Football', surface_type: 'Natural Grass', capacity: 400, price: 1500 }
    ]
  },
  {
    name: 'The Base Plaza Vasant Kunj',
    description: 'Premium sports facility located in South Delhi offering 5v5 and 7v7 turf football alongside high-grade basketball courts.',
    address: 'Nelson Mandela Marg, Vasant Kunj',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.539800,
    longitude: 77.156700,
    contact_phone: '+91 9811023456',
    contact_email: 'vasantkunj@thebase.in',
    amenities: ['Floodlights', 'Parking', 'Changing Rooms', 'First Aid', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1600 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 60, price: 900 }
    ]
  },
  {
    name: 'Thyagaraj Sports Stadium Arena',
    description: 'Historic Commonwealth Games facility featuring world-class indoor volleyball arenas and full-dimension football grounds.',
    address: 'INA Colony, Thyagaraj Stadium Rd',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.577200,
    longitude: 77.214100,
    contact_phone: '+91 9811034567',
    contact_email: 'thyagaraj@delhigov.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Shower Facility', 'Parking', 'Seating Gallery'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 600, price: 1800 },
      { name: 'Volleyball', surface_type: 'Indoor Court', capacity: 200, price: 900 }
    ]
  },
  {
    name: 'Gallant Sports Arena Gurgaon',
    description: 'Sprawling athletic facility on Golf Course Extension Road with multiple FIFA certified turf grounds and full cricket pitches.',
    address: 'Golf Course Extension Rd, Sector 56',
    city: 'Gurgaon',
    state: 'Haryana',
    latitude: 28.423100,
    longitude: 77.098400,
    contact_phone: '+91 9811045678',
    contact_email: 'gurgaon@gallantsports.in',
    amenities: ['Floodlights', 'Cafeteria', 'Parking', 'Washrooms', 'First Aid', 'Wi-Fi'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 150, price: 1500 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 100, price: 1500 }
    ]
  },
  {
    name: 'Hudle Turf CyberHub',
    description: 'Ultra-accessible rooftop sports turf situated next to DLF Cyber City, perfect for corporate tournaments and after-work matches.',
    address: 'DLF Phase 2, Sector 24',
    city: 'Gurgaon',
    state: 'Haryana',
    latitude: 28.495200,
    longitude: 77.089100,
    contact_phone: '+91 9811056789',
    contact_email: 'cybercity@hudle.in',
    amenities: ['Floodlights', 'Parking', 'Locker Room', 'Water Cooler', 'Changing Rooms'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1600 },
      { name: 'Badminton', surface_type: 'Synthetic Mats', capacity: 40, price: 600 }
    ]
  },
  {
    name: 'Noida Indoor Stadium & Sports Hub',
    description: 'Centrally air-conditioned multi-sport complex offering BWF certified badminton courts, wooden basketball courts, and outdoor cricket pitches.',
    address: 'Sector 21A',
    city: 'Noida',
    state: 'Uttar Pradesh',
    latitude: 28.591200,
    longitude: 77.337500,
    contact_phone: '+91 9811067890',
    contact_email: 'noidastadium@noidaauthority.in',
    amenities: ['Air Conditioning', 'Seating Gallery', 'Parking', 'Shower Facility', 'First Aid'],
    sports: [
      { name: 'Basketball', surface_type: 'Wooden Court', capacity: 180, price: 1100 },
      { name: 'Badminton', surface_type: 'BWF Mat', capacity: 80, price: 550 },
      { name: 'Cricket', surface_type: 'Turf Ground', capacity: 500, price: 1800 }
    ]
  },
  {
    name: 'Spartan Sports Complex Dwarka',
    description: 'Enclosed multi-sport venue in Dwarka with top-rated shock-absorbing turf, box cricket nets, and dedicated warming areas.',
    address: 'Sector 11, Dwarka',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.583400,
    longitude: 77.051200,
    contact_phone: '+91 9811078901',
    contact_email: 'dwarka@spartansports.in',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'First Aid', 'Water Cooler'],
    sports: [
      { name: 'Cricket', surface_type: 'Box Turf Pitch', capacity: 70, price: 1100 },
      { name: 'Football', surface_type: '7-a-side Turf', capacity: 90, price: 1200 }
    ]
  },
  {
    name: 'Kicksal Futsal Arena Greater Noida',
    description: 'Modern futsal hub providing high-speed play on non-abrasive turf and regulation outdoor volleyball facilities.',
    address: 'Knowledge Park III',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    latitude: 28.471500,
    longitude: 77.498100,
    contact_phone: '+91 9811089012',
    contact_email: 'kicksal@greaternoida.in',
    amenities: ['Floodlights', 'Parking', 'Water Cooler', 'Changing Rooms'],
    sports: [
      { name: 'Football', surface_type: 'Futsal Turf', capacity: 60, price: 1000 },
      { name: 'Volleyball', surface_type: 'Hard Court', capacity: 40, price: 700 }
    ]
  },

  // --- Hyderabad (6) ---
  {
    name: 'Gamepoint Jubilee Hills',
    description: 'High-end indoor athletic facility housing synthetic badminton courts, timber basketball courts, and outdoor rooftop 5-a-side turf.',
    address: 'Road No 36, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.431200,
    longitude: 78.407100,
    contact_phone: '+91 9849011223',
    contact_email: 'jubileehills@gamepoint.in',
    amenities: ['Floodlights', 'Air Conditioning', 'Locker Room', 'Cafeteria', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Badminton', surface_type: 'Synthetic Court', capacity: 60, price: 500 },
      { name: 'Basketball', surface_type: 'Indoor Timber', capacity: 80, price: 1100 },
      { name: 'Football', surface_type: 'Rooftop Turf', capacity: 60, price: 1300 }
    ]
  },
  {
    name: 'HotFut Gachibowli Arena',
    description: 'Heart of Hyderabad IT corridor sports venue with dual artificial football pitches and enclosed box cricket arenas.',
    address: 'Whitefields, Kondapur, Near Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.458900,
    longitude: 78.364200,
    contact_phone: '+91 9849022334',
    contact_email: 'gachibowli@hotfut.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Washrooms', 'Parking', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 100, price: 1400 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 70, price: 1300 }
    ]
  },
  {
    name: 'Gopichand Badminton & Sports Arena',
    description: 'World-renowned training center offering pristine BWF tournament courts, fitness suites, and dedicated basketball courts.',
    address: 'ISB Rd, Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.441100,
    longitude: 78.349800,
    contact_phone: '+91 9849033445',
    contact_email: 'gopichand@academy.in',
    amenities: ['Locker Room', 'Seating Gallery', 'Cafeteria', 'Pro Shop', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Badminton', surface_type: 'International Vinyl Mat', capacity: 300, price: 600 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 100, price: 950 }
    ]
  },
  {
    name: 'Astro Turf Madhapur',
    description: 'Top-tier turf ground minutes away from Cyber Towers, favored for midnight matches and corporate tournaments.',
    address: 'Ayyappa Society Main Rd, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.449100,
    longitude: 78.391200,
    contact_phone: '+91 9849044556',
    contact_email: 'madhapur@astroturf.in',
    amenities: ['Floodlights', 'Parking', 'Water Cooler', 'First Aid', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1250 },
      { name: 'Cricket', surface_type: 'Box Turf Pitch', capacity: 60, price: 1200 }
    ]
  },
  {
    name: 'LB Stadium Sports Enclave',
    description: 'Historic city-center stadium ground boasting tournament-ready turf wickets, floodlit volleyball fields, and spectator stands.',
    address: 'Fateh Maidan, Basheer Bagh',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.399400,
    longitude: 78.473500,
    contact_phone: '+91 9849055667',
    contact_email: 'lbstadium@telanganasports.gov.in',
    amenities: ['Pavilion', 'Floodlights', 'Seating Gallery', 'Parking', 'Washrooms'],
    sports: [
      { name: 'Cricket', surface_type: 'Clay Turf Pitch', capacity: 1000, price: 2000 },
      { name: 'Volleyball', surface_type: 'Outdoor Hard Court', capacity: 200, price: 750 }
    ]
  },
  {
    name: 'Dugout Sports Complex Financial District',
    description: 'Modern turf arena surrounded by Fortune 500 offices, equipped with heavy-duty floodlights and live-streaming camera setups.',
    address: 'Financial District, Nanakramguda',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.418200,
    longitude: 78.341100,
    contact_phone: '+91 9849066778',
    contact_email: 'nanakramguda@dugout.in',
    amenities: ['Floodlights', 'Cafeteria', 'Changing Rooms', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1350 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 70, price: 1300 }
    ]
  },

  // --- Chennai (6) ---
  {
    name: 'Tiki Taka Kilpauk',
    description: 'Pioneering rooftop football turf in Chennai providing cushioned monofilament artificial grass and premium night floodlights.',
    address: 'New Avadi Rd, Kilpauk',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.084100,
    longitude: 80.239200,
    contact_phone: '+91 9840011223',
    contact_email: 'kilpauk@tikitaka.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Parking', 'Water Cooler', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Certified Turf', capacity: 90, price: 1300 }
    ]
  },
  {
    name: 'Game On Turf T. Nagar',
    description: 'Central Chennai sports hub accommodating high-tempo 5v5 soccer matches and box cricket leagues in a fully netted arena.',
    address: 'Bazullah Rd, T. Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.041200,
    longitude: 80.233500,
    contact_phone: '+91 9840022334',
    contact_email: 'tnagar@gameonturf.com',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1100 }
    ]
  },
  {
    name: 'SDAT Multi-Sport Complex Nungambakkam',
    description: 'Government sports venue featuring international synthetic basketball courts, volleyball courts, and full locker room facilities.',
    address: 'Lake Area, Nungambakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.061800,
    longitude: 80.240500,
    contact_phone: '+91 9840033445',
    contact_email: 'sdat@tn.gov.in',
    amenities: ['Seating Gallery', 'Floodlights', 'Locker Room', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 250, price: 900 },
      { name: 'Volleyball', surface_type: 'Synthetic', capacity: 120, price: 750 }
    ]
  },
  {
    name: 'Whistle Urban Sports Hub OMR',
    description: 'Tech corridor multi-sports paradise offering football turfs, box cricket, and indoor wooden badminton courts.',
    address: 'Rajiv Gandhi Salai, Thoraipakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 12.934100,
    longitude: 80.231200,
    contact_phone: '+91 9840044556',
    contact_email: 'omr@whistlesports.com',
    amenities: ['Floodlights', 'Cafeteria', 'Parking', 'Shower Facility', 'Wi-Fi'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 90, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 70, price: 1100 },
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 40, price: 450 }
    ]
  },
  {
    name: 'Playce Arena Velachery',
    description: 'Premier suburban sports arena with weather-resistant turf pitches and acrylic basketball courts.',
    address: '100 Feet Bypass Rd, Velachery',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 12.981500,
    longitude: 80.218400,
    contact_phone: '+91 9840055667',
    contact_email: 'velachery@playcearena.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Washrooms', 'Parking'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1100 },
      { name: 'Basketball', surface_type: 'Outdoor Acrylic', capacity: 50, price: 800 }
    ]
  },
  {
    name: 'Marina Sports Arena Mylapore',
    description: 'Beachside sports ground hosting natural sand volleyball matches and fast-paced 5v5 football right by the coast.',
    address: 'Santhome High Rd, Mylapore',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.033500,
    longitude: 80.278400,
    contact_phone: '+91 9840066778',
    contact_email: 'marina@playsphere.local',
    amenities: ['Parking', 'Water Cooler', 'First Aid', 'Washrooms', 'Beach Showers'],
    sports: [
      { name: 'Volleyball', surface_type: 'Beach Sand Court', capacity: 100, price: 700 },
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1100 }
    ]
  },

  // --- Pune (5) ---
  {
    name: 'HotFut SP Infocity',
    description: 'Expansive football turf and cricket pitch set inside the SP Infocity tech park, boasting professional drainage systems.',
    address: 'SP Infocity, Fursungi',
    city: 'Pune',
    state: 'Maharashtra',
    latitude: 18.481200,
    longitude: 73.963400,
    contact_phone: '+91 9822011223',
    contact_email: 'infocity@hotfut.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Cafeteria', 'Parking', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 110, price: 1250 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 70, price: 1200 }
    ]
  },
  {
    name: 'Viman Nagar Sports Club',
    description: 'Vibrant neighborhood sports center with dual artificial football turfs and indoor synthetic badminton courts.',
    address: 'Sakore Nagar, Viman Nagar',
    city: 'Pune',
    state: 'Maharashtra',
    latitude: 18.567200,
    longitude: 73.914200,
    contact_phone: '+91 9822022334',
    contact_email: 'vimannagar@sportsclub.in',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1100 },
      { name: 'Badminton', surface_type: 'Synthetic Mats', capacity: 40, price: 450 }
    ]
  },
  {
    name: 'Balewadi Shiv Chhatrapati Sports Complex',
    description: 'National championship stadium offering international wooden basketball courts, Olympic badminton arenas, and volleyball facilities.',
    address: 'National Sports Complex, Mahalunge, Balewadi',
    city: 'Pune',
    state: 'Maharashtra',
    latitude: 18.579400,
    longitude: 73.766100,
    contact_phone: '+91 9822033445',
    contact_email: 'balewadi@maharashtrasports.gov.in',
    amenities: ['International Seating', 'Changing Rooms', 'Parking', 'Shower Facility', 'First Aid', 'Cafeteria'],
    sports: [
      { name: 'Basketball', surface_type: 'Maple Wood Floor', capacity: 600, price: 1400 },
      { name: 'Volleyball', surface_type: 'Indoor Synthetic', capacity: 300, price: 900 },
      { name: 'Badminton', surface_type: 'International BWF Mat', capacity: 400, price: 600 }
    ]
  },
  {
    name: 'Kothrud Turf Arena',
    description: 'Enclosed sports turf in West Pune catering to competitive cricket leagues and local football clubs.',
    address: 'Paud Rd, Rambaug Colony, Kothrud',
    city: 'Pune',
    state: 'Maharashtra',
    latitude: 18.508500,
    longitude: 73.812400,
    contact_phone: '+91 9822044556',
    contact_email: 'kothrud@turfarena.in',
    amenities: ['Floodlights', 'Washrooms', 'Parking', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1000 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 950 }
    ]
  },
  {
    name: 'Life Sports Academy Baner',
    description: 'Dedicated badminton and futsal academy featuring certified coaches, shock-resistant wooden flooring, and pro gear rental.',
    address: 'Near Pancard Club Rd, Baner',
    city: 'Pune',
    state: 'Maharashtra',
    latitude: 18.558100,
    longitude: 73.784500,
    contact_phone: '+91 9822055667',
    contact_email: 'baner@lifesports.in',
    amenities: ['Locker Room', 'Shower Facility', 'Parking', 'First Aid', 'Pro Shop'],
    sports: [
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 50, price: 450 },
      { name: 'Football', surface_type: '5-a-side Turf', capacity: 50, price: 1000 }
    ]
  },

  // --- Kolkata (4) ---
  {
    name: 'Salt Lake Sports Hub',
    description: 'Historic sports enclave with championship grass soccer fields and turf cricket pitches, well connected by Kolkata metro.',
    address: 'Sector III, Bidhannagar, Salt Lake',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.571400,
    longitude: 88.412500,
    contact_phone: '+91 9830011223',
    contact_email: 'saltlake@kolkatasports.in',
    amenities: ['Floodlights', 'Seating Pavilion', 'Changing Rooms', 'Parking', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 800, price: 1500 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 500, price: 1600 }
    ]
  },
  {
    name: 'KickOff Arena New Town',
    description: 'Modern sports facility in Rajarhat offering dual-turf setups with top-flight shock absorption and live match broadcasts.',
    address: 'Major Arterial Rd, Action Area II, New Town',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.612800,
    longitude: 88.468200,
    contact_phone: '+91 9830022334',
    contact_email: 'newtown@kickoffarena.in',
    amenities: ['Floodlights', 'Cafeteria', 'Parking', 'Water Cooler', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 100, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 70, price: 1100 }
    ]
  },
  {
    name: 'Eden Sports Pavilion & Turf',
    description: 'Heritage cricket ground and multi-sport court situated in the heart of Maidan, celebrated for pristine pitch maintenance.',
    address: 'B.B.D. Bagh, Strand Rd',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.564700,
    longitude: 88.343100,
    contact_phone: '+91 9830033445',
    contact_email: 'maidan@edensports.in',
    amenities: ['Pavilion', 'Historic Grandstand', 'Parking', 'Washrooms', 'First Aid'],
    sports: [
      { name: 'Cricket', surface_type: 'Clay Turf Pitch', capacity: 600, price: 1800 },
      { name: 'Volleyball', surface_type: 'Outdoor Court', capacity: 100, price: 700 }
    ]
  },
  {
    name: 'South City Futsal & Badminton Turf',
    description: 'Rooftop sports complex with an unforgettable Kolkata skyline view, specialized for evening futsal and badminton games.',
    address: 'Prince Anwar Shah Rd, Jadavpur',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.501200,
    longitude: 88.362400,
    contact_phone: '+91 9830044556',
    contact_email: 'southcity@futsalkolkata.in',
    amenities: ['Floodlights', 'Rooftop Seating', 'Parking', 'Washrooms', 'Locker Room'],
    sports: [
      { name: 'Football', surface_type: 'Rooftop Turf', capacity: 80, price: 1300 },
      { name: 'Badminton', surface_type: 'Synthetic', capacity: 40, price: 500 }
    ]
  },

  // --- Kochi & Kerala (4) ---
  {
    name: 'Jawaharlal Nehru Stadium Turf Ground',
    description: 'The epicenter of Kerala football, providing first-class natural grass turf, international LED floodlights, and player dugouts.',
    address: 'Stadium Rd, Kaloor',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 9.998400,
    longitude: 76.300500,
    contact_phone: '+91 9846011223',
    contact_email: 'kaloor@keralasports.org',
    amenities: ['International Floodlights', 'Seating Gallery', 'Locker Room', 'Parking', 'Shower Facility'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 1000, price: 1900 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 600, price: 1700 }
    ]
  },
  {
    name: 'United Sports Centre Kakkanad',
    description: 'Premier sports destination right by Infopark Kochi featuring FIFA quality football turf and indoor wooden badminton courts.',
    address: 'Seaport - Airport Rd, Kakkanad',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 10.015200,
    longitude: 76.341800,
    contact_phone: '+91 9846022334',
    contact_email: 'kakkanad@unitedsports.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Cafeteria', 'Parking', 'Wi-Fi'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 90, price: 1200 },
      { name: 'Badminton', surface_type: 'Wooden Floor', capacity: 40, price: 400 }
    ]
  },
  {
    name: 'Decathlon Kalamassery Sports Arena',
    description: 'Sprawling outdoor activity zone featuring basketball courts, volleyball sand courts, and full artificial football pitches.',
    address: 'NH 47, Kalamassery',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 10.052100,
    longitude: 76.319500,
    contact_phone: '+91 9846033445',
    contact_email: 'kalamassery@decathlon.in',
    amenities: ['Parking', 'Washrooms', 'Pro Shop', 'First Aid', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 950 },
      { name: 'Basketball', surface_type: 'Acrylic Court', capacity: 50, price: 700 },
      { name: 'Volleyball', surface_type: 'Synthetic', capacity: 40, price: 600 }
    ]
  },
  {
    name: 'Champions Turf Panampilly Nagar',
    description: 'Centrally situated enclosed turf arena in upscale Panampilly Nagar, ideal for fast 5-a-side matches and corporate matches.',
    address: 'Main Ave, Panampilly Nagar',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 9.961200,
    longitude: 76.294100,
    contact_phone: '+91 9846044556',
    contact_email: 'panampilly@championsturf.com',
    amenities: ['Floodlights', 'Changing Rooms', 'Parking', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1100 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 50, price: 1000 }
    ]
  },

  // --- Ahmedabad, Chandigarh, Jaipur, Lucknow, Goa, Indore, Bhubaneswar, Vizag (12) ---
  {
    name: 'Sardar Patel Sports Complex',
    description: 'Comprehensive sporting complex offering championship clay cricket pitches, outdoor basketball courts, and indoor badminton mats.',
    address: 'Stadium Rd, Navrangpura',
    city: 'Ahmedabad',
    state: 'Gujarat',
    latitude: 23.041800,
    longitude: 72.562100,
    contact_phone: '+91 9825011223',
    contact_email: 'navrangpura@gujaratsports.in',
    amenities: ['Floodlights', 'Seating Gallery', 'Parking', 'Shower Facility', 'Cafeteria'],
    sports: [
      { name: 'Cricket', surface_type: 'Clay Turf Pitch', capacity: 600, price: 1500 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 100, price: 800 },
      { name: 'Badminton', surface_type: 'BWF Mat', capacity: 60, price: 450 }
    ]
  },
  {
    name: 'The Arena by TransStadia',
    description: 'World-class convertible stadium arena in Kankaria Lake precinct hosting football fixtures and indoor volleyball championships.',
    address: 'Kankaria Lake, Maninagar',
    city: 'Ahmedabad',
    state: 'Gujarat',
    latitude: 22.998100,
    longitude: 72.602500,
    contact_phone: '+91 9825022334',
    contact_email: 'kankaria@transstadia.com',
    amenities: ['Air Conditioning', 'Locker Room', 'Cafeteria', 'Multi-tier Parking', 'Seating Gallery'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 500, price: 1700 },
      { name: 'Volleyball', surface_type: 'Indoor Synthetic', capacity: 200, price: 900 }
    ]
  },
  {
    name: 'Ahmedabad Football Turf Bopal',
    description: 'Well-maintained multi-court turf facility in West Ahmedabad with premium LED lighting and spectator lounge.',
    address: 'South Bopal Main Rd, Bopal',
    city: 'Ahmedabad',
    state: 'Gujarat',
    latitude: 23.023400,
    longitude: 72.469100,
    contact_phone: '+91 9825033445',
    contact_email: 'bopal@ahmedabadturf.in',
    amenities: ['Floodlights', 'Parking', 'Changing Rooms', 'Water Cooler'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1100 }
    ]
  },
  {
    name: 'Chandigarh Sports Club Arena',
    description: 'Green lush athletic club with top-tier badminton courts, football pitches, and cricket training nets.',
    address: 'Sector 42, Attawa',
    city: 'Chandigarh',
    state: 'Punjab',
    latitude: 30.724100,
    longitude: 76.748200,
    contact_phone: '+91 9814011223',
    contact_email: 'sector42@chandigarhsports.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Water Cooler', 'Parking', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 300, price: 1200 },
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 60, price: 450 },
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 200, price: 1300 }
    ]
  },
  {
    name: 'Panchkula Golf & Sports Turf',
    description: 'Serene sports arena nestled near the Shivalik foothills offering turf football and competitive box cricket.',
    address: 'Sector 3, Panchkula',
    city: 'Panchkula',
    state: 'Haryana',
    latitude: 30.694100,
    longitude: 76.861200,
    contact_phone: '+91 9814022334',
    contact_email: 'panchkula@sportsturf.in',
    amenities: ['Floodlights', 'Parking', 'Cafeteria', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 70, price: 1100 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 50, price: 1000 }
    ]
  },
  {
    name: 'Goa United Sports Arena Margao',
    description: 'Iconic coastal sporting facility in South Goa featuring tournament-ready football turf and natural sand volleyball courts.',
    address: 'Fatorda, Margao',
    city: 'Margao',
    state: 'Goa',
    latitude: 15.289100,
    longitude: 73.968200,
    contact_phone: '+91 9823011223',
    contact_email: 'fatorda@goaunited.in',
    amenities: ['Floodlights', 'Parking', 'Beach Showers', 'Cafeteria', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'FIFA Artificial Turf', capacity: 200, price: 1100 },
      { name: 'Volleyball', surface_type: 'Beach Sand Court', capacity: 60, price: 650 }
    ]
  },
  {
    name: 'Panaji Miramar Sports Turf',
    description: 'Picturesque beachside turf in North Goa, loved by local football clubs and weekend sports travelers.',
    address: 'Miramar Beach Rd, Panaji',
    city: 'Panaji',
    state: 'Goa',
    latitude: 15.481200,
    longitude: 73.812300,
    contact_phone: '+91 9823022334',
    contact_email: 'miramar@goaturf.in',
    amenities: ['Floodlights', 'Parking', 'Water Cooler', 'Washrooms'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1200 },
      { name: 'Volleyball', surface_type: 'Sand Court', capacity: 50, price: 600 }
    ]
  },
  {
    name: 'Jaipur Sports Arena Mansarovar',
    description: 'Rajasthan capital’s top recreational hub with floodlit turf pitches, cricket nets, and indoor badminton courts.',
    address: 'Madhyam Marg, Mansarovar',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.852100,
    longitude: 75.768200,
    contact_phone: '+91 9829011223',
    contact_email: 'mansarovar@jaipursports.in',
    amenities: ['Floodlights', 'Parking', 'Locker Room', 'Water Cooler', 'Cafeteria'],
    sports: [
      { name: 'Cricket', surface_type: 'Turf Pitch', capacity: 200, price: 1200 },
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 80, price: 1100 },
      { name: 'Badminton', surface_type: 'Synthetic Mat', capacity: 40, price: 400 }
    ]
  },
  {
    name: 'Lucknow Ekana Sports Hub',
    description: 'Modern sports facility adjacent to the international stadium with all-weather football turf and indoor basketball arena.',
    address: 'Amar Shaheed Path, Gomti Nagar Extension',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    latitude: 26.793100,
    longitude: 81.014200,
    contact_phone: '+91 9839011223',
    contact_email: 'ekana@lucknowsports.in',
    amenities: ['Floodlights', 'Seating Gallery', 'Parking', 'Cafeteria', 'Shower Facility'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 150, price: 1300 },
      { name: 'Basketball', surface_type: 'Hard Court', capacity: 80, price: 800 }
    ]
  },
  {
    name: 'Indore Velocity Sports Complex',
    description: 'High-energy sports arena in Indore featuring floodlit cricket turf and tournament-grade indoor badminton courts.',
    address: 'Ring Rd, Scheme No 54, Vijay Nagar',
    city: 'Indore',
    state: 'Madhya Pradesh',
    latitude: 22.753400,
    longitude: 75.894100,
    contact_phone: '+91 9826011223',
    contact_email: 'vijaynagar@velocitysports.in',
    amenities: ['Floodlights', 'Changing Rooms', 'Washrooms', 'Parking', 'First Aid'],
    sports: [
      { name: 'Cricket', surface_type: 'Box Cricket Turf', capacity: 80, price: 1100 },
      { name: 'Badminton', surface_type: 'Wooden Court', capacity: 40, price: 450 },
      { name: 'Football', surface_type: '5-a-side Turf', capacity: 60, price: 1000 }
    ]
  },
  {
    name: 'Bhubaneswar Kalinga Sports Enclave',
    description: 'Renowned sports capital venue with world-class hockey, football turf, and cushioned volleyball courts.',
    address: 'Bidyut Marg, Nayapalli',
    city: 'Bhubaneswar',
    state: 'Odisha',
    latitude: 20.301200,
    longitude: 85.821400,
    contact_phone: '+91 9861011223',
    contact_email: 'kalinga@odishasports.gov.in',
    amenities: ['International Floodlights', 'Locker Room', 'Parking', 'Cafeteria', 'First Aid'],
    sports: [
      { name: 'Football', surface_type: 'Natural Grass', capacity: 500, price: 1400 },
      { name: 'Volleyball', surface_type: 'Synthetic', capacity: 150, price: 750 }
    ]
  },
  {
    name: 'Vizag Sea View Sports Turf',
    description: 'Scenic hilltop sports arena overlooking the Bay of Bengal, providing 7-a-side football turf and box cricket.',
    address: 'Beach Rd, Rushikonda',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    latitude: 17.781200,
    longitude: 83.382100,
    contact_phone: '+91 9848011223',
    contact_email: 'rushikonda@vizagturf.in',
    amenities: ['Floodlights', 'Sea View Deck', 'Parking', 'Washrooms', 'Cafeteria'],
    sports: [
      { name: 'Football', surface_type: 'Artificial Turf', capacity: 90, price: 1200 },
      { name: 'Cricket', surface_type: 'Box Cricket', capacity: 60, price: 1100 }
    ]
  }
];

function buildGroundImages(sports = []) {
  const sportNames = new Set(sports.map(sport => sport.name.toLowerCase()));
  const supportedSports = ['football', 'cricket', 'basketball', 'volleyball', 'badminton']
    .filter(sportName => sportNames.has(sportName));
  const imageSports = supportedSports.length ? supportedSports : ['multisport'];
  return imageSports.map(sportName => `/images/demo/grounds/ground-${sportName}.svg`);
}

const TIME_SLOTS = [
  { start: '06:00:00', end: '07:00:00' },
  { start: '07:00:00', end: '08:00:00' },
  { start: '08:00:00', end: '09:00:00' },
  { start: '16:00:00', end: '17:00:00' },
  { start: '17:00:00', end: '18:00:00' },
  { start: '18:00:00', end: '19:00:00' },
  { start: '19:00:00', end: '20:00:00' },
  { start: '20:00:00', end: '21:00:00' },
  { start: '21:00:00', end: '22:00:00' },
];

async function seedGrounds() {
  console.log(`Starting to seed ${GROUNDS_DATA.length} grounds into PlaySphere database...`);

  // 1. Ensure Badminton exists in sports
  await query(`
    INSERT INTO sports (name, slug, description, min_players_per_team, max_players_per_team)
    VALUES ('Badminton', 'badminton', 'Badminton. Singles (1v1) or doubles (2v2).', 1, 2)
    ON CONFLICT (name) DO NOTHING;
  `);

  // 2. Fetch all sports
  const sportsRes = await query('SELECT id, name, slug FROM sports');
  const sportMap = {};
  for (const s of sportsRes.rows) {
    sportMap[s.name.toLowerCase()] = s.id;
  }
  console.log('Available sports in DB:', Object.keys(sportMap));

  // 3. Find admin user or first user to set as owner
  const adminRes = await query("SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1");
  const ownerId = adminRes.rows[0]?.id || null;
  console.log('Grounds owner user ID:', ownerId || 'None (Public venues)');

  let groundsInserted = 0;
  let groundSportsInserted = 0;
  let availabilitiesInserted = 0;
  let bookingSlotsInserted = 0;

  // Generate date list for the upcoming 7 days (including today)
  const upcomingDates = [];
  const localTodayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const getTodayPart = (type) => localTodayParts.find(part => part.type === type).value;
  const today = new Date(Date.UTC(
    Number(getTodayPart('year')),
    Number(getTodayPart('month')) - 1,
    Number(getTodayPart('day'))
  ));
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    upcomingDates.push(`${year}-${month}-${day}`);
  }

  for (const g of GROUNDS_DATA) {
    // Check if ground already exists by name
    const existing = await query('SELECT id FROM grounds WHERE name = $1', [g.name]);
    let groundId;

    if (existing.rows.length > 0) {
      groundId = existing.rows[0].id;
      // Update details to make sure they have latest data
      await query(`
        UPDATE grounds SET
          description = $1, address = $2, city = $3, state = $4,
          latitude = $5, longitude = $6, contact_phone = $7, contact_email = $8,
          amenities = $9,
          images = CASE WHEN images IS NULL OR images = '[]'::jsonb THEN $10::jsonb ELSE images END,
          is_active = true, updated_at = NOW()
        WHERE id = $11
      `, [
        g.description, g.address, g.city, g.state,
        g.latitude, g.longitude, g.contact_phone, g.contact_email,
        JSON.stringify(g.amenities), JSON.stringify(buildGroundImages(g.sports)), groundId
      ]);
    } else {
      const inserted = await query(`
        INSERT INTO grounds (
          name, description, address, city, state,
          latitude, longitude, contact_phone, contact_email,
          amenities, images, is_active, owner_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
        RETURNING id
      `, [
        g.name, g.description, g.address, g.city, g.state,
        g.latitude, g.longitude, g.contact_phone, g.contact_email,
        JSON.stringify(g.amenities), JSON.stringify(buildGroundImages(g.sports)), ownerId
      ]);
      groundId = inserted.rows[0].id;
      groundsInserted++;
    }

    // Link sports to ground
    let primarySportId = null;
    let basePrice = 1000;

    for (const sp of g.sports) {
      const sportId = sportMap[sp.name.toLowerCase()];
      if (!sportId) continue;
      if (!primarySportId) {
        primarySportId = sportId;
        basePrice = sp.price || 1000;
      }

      const gsInsert = await query(`
        INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (ground_id, sport_id) DO UPDATE
        SET surface_type = EXCLUDED.surface_type, capacity = EXCLUDED.capacity
        RETURNING id
      `, [groundId, sportId, sp.surface_type, sp.capacity]);

      if (gsInsert.rowCount > 0) groundSportsInserted++;

      // Weekly availability (0 to 6 days of week)
      for (let day = 0; day <= 6; day++) {
        const availRes = await query(`
          INSERT INTO ground_availability (
            ground_id, sport_id, day_of_week, start_time, end_time,
            slot_duration_minutes, price_per_slot, is_active
          ) VALUES ($1, $2, $3, '06:00:00', '22:00:00', 60, $4, true)
          RETURNING id
        `, [groundId, sportId, day, sp.price]);
        if (availRes.rowCount > 0) availabilitiesInserted++;
      }
    }

    // Concrete booking slots for next 7 days
    for (const dateStr of upcomingDates) {
      for (const slot of TIME_SLOTS) {
        try {
          const slotRes = await query(`
            INSERT INTO ground_booking_slots (
              ground_id, sport_id, slot_date, start_time, end_time, price, is_available
            ) VALUES ($1, $2, $3, $4, $5, $6, true)
          ON CONFLICT DO NOTHING
            RETURNING id
          `, [groundId, primarySportId, dateStr, slot.start, slot.end, basePrice]);

          if (slotRes.rows.length > 0) bookingSlotsInserted++;
        } catch {
          // ignore duplicate conflict
        }
      }
    }
  }

  // Count total in database now
  const totalGrounds = await query('SELECT count(*) FROM grounds');
  const totalSlots = await query('SELECT count(*) FROM ground_booking_slots');
  const totalByCity = await query('SELECT city, count(*) FROM grounds GROUP BY city ORDER BY count DESC');

  console.log('\n=============================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log(`Total Grounds in Database: ${totalGrounds.rows[0].count}`);
  console.log(`Total Booking Slots Generated: ${totalSlots.rows[0].count}`);
  console.log('\nGrounds Count by City:');
  totalByCity.rows.forEach(r => console.log(`  - ${r.city}: ${r.count} grounds`));
  console.log('=============================================\n');

  process.exit(0);
}

if (require.main === module) {
  seedGrounds().catch(err => {
    console.error('Fatal error during seeding:', err);
    process.exit(1);
  });
}

module.exports = { GROUNDS_DATA, TIME_SLOTS, buildGroundImages, seedGrounds };
