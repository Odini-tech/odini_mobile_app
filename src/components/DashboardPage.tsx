import React from 'react';
import { Heart, Calendar, MapPin, TrendingUp, Clock, Play, Shuffle, ChevronRight, Star, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  price: string | number;
  attendees: number;
  rating: number;
  category: string;
  organizer: string;
  isVerified?: boolean;
}

interface DashboardPageProps {
  onCardClick?: (item: SearchResult) => void;
}

export function DashboardPage({ onCardClick }: DashboardPageProps) {
  const upcomingEvents: SearchResult[] = [
    {
      id: "1",
      title: "ZAMBIAN ART AND DESIGN SHOW",
      description: "Experience the finest Zambian art and design at CIELA. A showcase of local talent and creativity across various artistic disciplines.",
      imageUrl: "/images/LSK event 1.png",
      date: "Friday, Nov 21",
      time: "All Day",
      location: "CIELA",
      price: "From K100",
      attendees: 189,
      rating: 4.6,
      category: "Art",
      organizer: "CIELA",
      isVerified: true
    },
    {
      id: "2",
      title: "LUSAKA THRIFT MARKET & BLOCK PARTY",
      description: "Join the thrift market and block party featuring special guest Samia the Great. Enjoy Zamrock music, shopping, and community vibes.",
      imageUrl: "/images/lsk event 2.png",
      date: "Saturday, TBA",
      time: "All Day",
      location: "NGAGRES MALL",
      price: "K50",
      attendees: 312,
      rating: 4.4,
      category: "Shopping",
      organizer: "Sampa the Great",
      isVerified: false
    },
    {
      id: "3",
      title: "15TH LUSAKA MOTOR SHOW",
      description: "Zambia's biggest motor show featuring vehicles, tractor zone, earth moving equipment, green energy solutions, and financing options.",
      imageUrl: "/images/lsk event3.png",
      date: "Friday, Aug 29",
      time: "All Day",
      location: "LUSAKA POLO CLUB",
      price: "100",
      attendees: 567,
      rating: 4.7,
      category: "Automotive",
      organizer: "Professional Insurance",
      isVerified: true
    },
  ];

  const favoritePlaces: SearchResult[] = [
    {
      id: "4",
      title: "MAZABUKA AGRI EXPO",
      description: "Agricultural exposition powered by Professional Insurance, featuring exhibitors including Zambian Commodity Exchange and industry partners.",
      imageUrl: "/images/lsk event 4.png",
      date: "Friday, Oct 10",
      time: "All Day",
      location: "MAZABUKA TURF CLUB",
      price: "50",
      attendees: 423,
      rating: 4.5,
      category: "Business",
      organizer: "Professional Insurance",
      isVerified: true
    },
    {
      id: "5",
      title: "CLASSIC CARS AUTO SHOW 2025",
      description: "Classic car exhibition featuring exclusive market, car boot sale, full cash bar, music, food court, and wine tasting experience.",
      imageUrl: "/images/LsK events 5.png",
      date: "Sunday, Aug 24",
      time: "9:30 AM onwards",
      location: "TBA",
      price: "50",
      attendees: 278,
      rating: 4.3,
      category: "Automotive",
      organizer: "Classic Cars Zambia",
      isVerified: false
    },
    {
      id: "6",
      title: "EL MUKUKA'S ALBUM LAUNCH",
      description: "Experience El Mukuka's album launch with live performance on grand piano plus band, followed by DJ after party with special guests.",
      imageUrl: "/images/lsk event 6.png",
      date: "Saturday, Dec 6",
      time: "7:00 PM - 1:00 AM",
      location: "TBA",
      price: "200",
      attendees: 156,
      rating: 4.8,
      category: "Music",
      organizer: "Stella Artois",
      isVerified: false
    },
    {
      id: "7",
      title: "Stories in the Woods",
      description: "Interactive story experience for children ages 6 to 10 at Chirfwema Arboretum. A magical educational adventure in nature.",
      imageUrl: "/images/lsk event6.png",
      date: "Saturday, Nov 22",
      time: "9:00 AM - 12:00 PM",
      location: "Chirfwema Arboretum",
      price: "500",
      attendees: 89,
      rating: 4.9,
      category: "Education",
      organizer: "Stories with Sala",
      isVerified: true
    },
    {
      id: "8",
      title: "GREEN COSMOS - KEEP ZAMBIA CLEAN",
      description: "Community clean-up initiative with special guest Simon Imme Walane. Join us in keeping Zambia clean and beautiful.",
      imageUrl: "/images/green events.jpg",
      date: "Friday, Nov 7",
      time: "All Day",
      location: "Kaunda Square Stage 1 Market",
      price: "Free",
      attendees: 234,
      rating: 4.7,
      category: "Community",
      organizer: "Green Cosmos Zambia",
      isVerified: true
    },
  ];

  const recentlyVisited: SearchResult[] = [
    {
      id: "9",
      title: "RENPOWER ZAMBIA 2025",
      description: "3rd edition energy conference focusing on unlocking access to green energy generation and accelerating grid stability.",
      imageUrl: "/images/green events2.jpg",
      date: "Friday, Jul 11",
      time: "All Day",
      location: "Lusaka, Zambia",
      price: "TBA",
      attendees: 345,
      rating: 4.6,
      category: "Business",
      organizer: "Euroconvention Global",
      isVerified: true
    },
    {
      id: "10",
      title: "YOUTH CONNEKT ZAMBIA - GREEN HUSTLE",
      description: "Youth entrepreneurship and innovation in agriculture event organized by Ministry of Youth, Sport & Arts and United Nations Zambia.",
      imageUrl: "/images/green events3.jpg",
      date: "Monday, Nov 17",
      time: "All Day",
      location: "New Government Complex, Lusaka",
      price: "Free",
      attendees: 512,
      rating: 4.5,
      category: "Business",
      organizer: "Ministry of Youth, Sport & Arts",
      isVerified: true
    },
    {
      id: "11",
      title: "BOUNCE ZAMBIA",
      description: "The ultimate trampoline park experience in Lusaka. Enjoy wall-to-wall trampolines, dodgeball, foam pits, and more for all ages.",
      imageUrl: "/images/bounce.PNG",
      date: "",
      time: "All Day",
      location: "Garden City Mall, Lusaka",
      price: "150",
      attendees: 300,
      rating: 4.9,
      category: "Recreation",
      organizer: "Bounce Zambia",
      isVerified: false
    }
  ];

  const collections = [
    {
      id: 1,
      title: "LSK Nightlife",
      description: "Your favorite after-dark spots",
      count: 12,
      gradient: "from-purple-600 to-pink-600",
      image: "https://images.unsplash.com/photo-1613723984367-a9b7ee9052d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9uJTIwY2l0eSUyMGxpZ2h0cyUyMG5pZ2h0fGVufDF8fHx8MTc2MzUzMzkxNHww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 2,
      title: "favorite nshima spots",
      description: "Delicious discoveries",
      count: 18,
      gradient: "from-orange-600 to-red-600",
      image: "https://images.unsplash.com/photo-1675674683873-1232862e3c64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZmVzdGl2YWwlMjBtYXJrZXR8ZW58MXx8fHwxNzYzNDA2MDE1fDA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 3,
      title: "Weekend Escapes",
      description: "Perfect getaway spots",
      count: 8,
      gradient: "from-blue-600 to-cyan-600",
      image: "https://images.unsplash.com/photo-1651058768220-584a599f4bc7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdW5zZXQlMjBiZWFjaCUyMHBhcmFkaXNlfGVufDF8fHx8MTc2MzYxNDY5Mnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 4,
      title: "zambian Arts & Culture",
      description: "Creative experiences",
      count: 15,
      gradient: "from-indigo-600 to-purple-600",
      image: "https://images.unsplash.com/photo-1719935115623-4857df23f3c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBnYWxsZXJ5JTIwZXhoaWJpdGlvbnxlbnwxfHx8fDE3NjM0MTc0ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Hero Section - Spotify Style */}
      <div className="relative h-[340px] bg-gradient-to-b from-purple-900/40 via-purple-800/20 to-background overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(92, 246, 156, 0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(39, 219, 195, 0.1),transparent_50%)]" />
        
        <div className="relative px-6 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-m text-muted-foreground mb-2">Your holiday starter pack</p>
              <h1 className="text-4xl font-bold">hello Alex</h1>
            </div>
            <Button size="icon" variant="ghost" className="w-10 h-10">
              <Calendar className="w-5 h-5" />
            </Button>
          </div>

          {/* Featured Collections - Scrollable */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="flex-shrink-0 w-[280px] h-[160px] relative overflow-hidden cursor-pointer group hover:scale-105 transition-all border-0"
              >
                <div className="absolute inset-0">
                  <img
                    src={collection.image}
                    alt={collection.title}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${collection.gradient} opacity-80 group-hover:opacity-70 transition-opacity`} />
                </div>
                <div className="relative h-full p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{collection.title}</h3>
                    <p className="text-sm text-white/80">{collection.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      {collection.count} places
                    </Badge>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 mt-8 space-y-10">
        {/* Recently Visited - Horizontal Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recently Visited</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Show all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recentlyVisited.map((place) => (
              <Card
                key={place.id}
                className="group cursor-pointer hover:bg-accent/50 transition-all overflow-hidden"
                onClick={() => onCardClick?.(place)}
              >
                <div className="flex gap-3 p-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={place.imageUrl}
                      alt={place.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">{place.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{place.location}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{place.rating}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Coming Up Next</h2>
              <p className="text-sm text-muted-foreground mt-1">Your scheduled adventures</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              View all
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="cursor-pointer group"
                onClick={() => onCardClick?.(event)}
              >
                <Card className="overflow-hidden border-0 bg-card hover:bg-accent/50 transition-all">
                  <div className="aspect-square relative overflow-hidden rounded-lg mb-3">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {event.date && (
                      <Badge className="absolute top-2 left-2 bg-primary">
                        {event.date}
                      </Badge>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <h3 className="font-medium truncate mb-1">{event.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Your Top Places */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Your Top Places</h2>
              <p className="text-sm text-muted-foreground mt-1">Most visited this month</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              See more
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favoritePlaces.map((place) => (
              <div
                key={place.id}
                className="cursor-pointer group"
                onClick={() => onCardClick?.(place)}
              >
                <div className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                    <img
                      src={place.imageUrl}
                      alt={place.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {place.isVerified && (
                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-500 fill-blue-500" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{place.rating}</span>
                        </div>
                        <span className="text-xs">ZMW {place.price}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm truncate mb-1">{place.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{place.location}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Made For You */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-1">Made For You</h2>
            <p className="text-sm text-muted-foreground">Personalized recommendations based on your taste</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...upcomingEvents.slice(0, 2), ...favoritePlaces.slice(0, 3)].map((place) => (
              <div
                key={`rec-${place.id}`}
                className="cursor-pointer group"
                onClick={() => onCardClick?.(place)}
              >
                <Card className="overflow-hidden border-0 bg-card hover:bg-accent/50 transition-all">
                  <div className="aspect-square relative overflow-hidden rounded-lg mb-3">
                    <img
                      src={place.imageUrl}
                      alt={place.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <h3 className="font-medium text-sm truncate mb-1">{place.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{place.location}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
