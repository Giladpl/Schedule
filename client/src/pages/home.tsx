import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#dadce0] py-4 px-6 flex justify-between items-center bg-white z-10">
        <div className="flex items-center">
          <h1 className="text-xl font-medium text-[#202124] font-google-sans">Meeting Scheduler</h1>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-6 md:p-12">
        <div className="flex flex-col md:flex-row items-center gap-12 py-12">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-[#202124] font-google-sans mb-6">
              Book your meeting in just a few clicks
            </h1>
            <p className="text-lg text-[#5f6368] mb-8">
              Our scheduling system makes it easy to find available time slots and book a meeting based on your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/calendar">
                <Button className="bg-[#1a73e8] hover:bg-blue-600 text-white px-8 py-3 rounded-md text-lg">
                  View Calendar
                </Button>
              </Link>
              <Link href="/calendar?type=vip">
                <Button variant="outline" className="border-[#dadce0] text-[#1a73e8] hover:bg-[#f8f9fa] px-8 py-3 rounded-md text-lg">
                  VIP Scheduling
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md">
              <svg 
                viewBox="0 0 550 400" 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-full h-auto"
              >
                <rect x="50" y="50" width="450" height="300" rx="8" fill="#ffffff" stroke="#dadce0" strokeWidth="2"/>
                <rect x="50" y="50" width="450" height="60" rx="8" fill="#f8f9fa" stroke="#dadce0" strokeWidth="2"/>
                <text x="70" y="85" fontFamily="Arial" fontSize="16" fill="#202124">May 2023</text>
                <line x1="50" y1="110" x2="500" y2="110" stroke="#dadce0" strokeWidth="1"/>
                
                <text x="80" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">SUN</text>
                <text x="150" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">MON</text>
                <text x="220" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">TUE</text>
                <text x="290" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">WED</text>
                <text x="360" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">THU</text>
                <text x="430" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">FRI</text>
                <text x="470" y="130" fontFamily="Arial" fontSize="12" fill="#5f6368">SAT</text>
                
                <line x1="50" y1="140" x2="500" y2="140" stroke="#dadce0" strokeWidth="1"/>
                
                <text x="80" y="165" fontFamily="Arial" fontSize="14" fill="#5f6368">30</text>
                <text x="150" y="165" fontFamily="Arial" fontSize="14" fill="#202124">1</text>
                <text x="220" y="165" fontFamily="Arial" fontSize="14" fill="#202124">2</text>
                <text x="290" y="165" fontFamily="Arial" fontSize="14" fill="#202124">3</text>
                <text x="360" y="165" fontFamily="Arial" fontSize="14" fill="#202124">4</text>
                <text x="430" y="165" fontFamily="Arial" fontSize="14" fill="#202124">5</text>
                <text x="470" y="165" fontFamily="Arial" fontSize="14" fill="#202124">6</text>
                
                <rect x="140" y="175" width="40" height="20" rx="4" fill="#1a73e8"/>
                <text x="144" y="189" fontFamily="Arial" fontSize="10" fill="#ffffff">9:30 AM</text>
                
                <rect x="210" y="175" width="40" height="20" rx="4" fill="#fbbc04"/>
                <text x="214" y="189" fontFamily="Arial" fontSize="10" fill="#202124">2:00 PM</text>
                
                <text x="80" y="215" fontFamily="Arial" fontSize="14" fill="#202124">7</text>
                <text x="150" y="215" fontFamily="Arial" fontSize="14" fill="#202124">8</text>
                <text x="220" y="215" fontFamily="Arial" fontSize="14" fill="#202124">9</text>
                <text x="290" y="215" fontFamily="Arial" fontSize="14" fill="#202124">10</text>
                <text x="360" y="215" fontFamily="Arial" fontSize="14" fill="#202124">11</text>
                <text x="430" y="215" fontFamily="Arial" fontSize="14" fill="#202124">12</text>
                <text x="470" y="215" fontFamily="Arial" fontSize="14" fill="#202124">13</text>
                
                <rect x="70" y="225" width="40" height="20" rx="4" fill="#1a73e8"/>
                <text x="74" y="239" fontFamily="Arial" fontSize="10" fill="#ffffff">10:00 AM</text>
                
                <rect x="280" y="225" width="40" height="20" rx="4" fill="#1a73e8"/>
                <text x="284" y="239" fontFamily="Arial" fontSize="10" fill="#ffffff">1:30 PM</text>
                
                <circle cx="80" cy="213" r="15" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1"/>
                <text x="80" y="215" fontFamily="Arial" fontSize="14" fill="#1a73e8" textAnchor="middle" dominantBaseline="middle">7</text>
                
                <text x="80" y="265" fontFamily="Arial" fontSize="14" fill="#202124">14</text>
                <text x="150" y="265" fontFamily="Arial" fontSize="14" fill="#202124">15</text>
                <text x="220" y="265" fontFamily="Arial" fontSize="14" fill="#202124">16</text>
                <text x="290" y="265" fontFamily="Arial" fontSize="14" fill="#202124">17</text>
                <text x="360" y="265" fontFamily="Arial" fontSize="14" fill="#202124">18</text>
                <text x="430" y="265" fontFamily="Arial" fontSize="14" fill="#202124">19</text>
                <text x="470" y="265" fontFamily="Arial" fontSize="14" fill="#202124">20</text>
                
                <rect x="350" y="275" width="40" height="20" rx="4" fill="#fbbc04"/>
                <text x="354" y="289" fontFamily="Arial" fontSize="10" fill="#202124">3:30 PM</text>
                
                <text x="80" y="315" fontFamily="Arial" fontSize="14" fill="#202124">21</text>
                <text x="150" y="315" fontFamily="Arial" fontSize="14" fill="#202124">22</text>
                <text x="220" y="315" fontFamily="Arial" fontSize="14" fill="#202124">23</text>
                <text x="290" y="315" fontFamily="Arial" fontSize="14" fill="#202124">24</text>
                <text x="360" y="315" fontFamily="Arial" fontSize="14" fill="#202124">25</text>
                <text x="430" y="315" fontFamily="Arial" fontSize="14" fill="#202124">26</text>
                <text x="470" y="315" fontFamily="Arial" fontSize="14" fill="#202124">27</text>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="py-12">
          <h2 className="text-2xl font-bold text-[#202124] font-google-sans mb-6 text-center">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg border border-[#dadce0]">
              <div className="bg-[#e8f0fe] p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1a73e8]"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124] font-google-sans mb-2">
                Availability Management
              </h3>
              <p className="text-[#5f6368]">
                View available time slots in a clean, intuitive calendar interface with weekly and monthly views.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-[#dadce0]">
              <div className="bg-[#fef7e0] p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#fbbc04]"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124] font-google-sans mb-2">
                Client Type Filtering
              </h3>
              <p className="text-[#5f6368]">
                Specialized scheduling for different client types with dedicated VIP and new client options.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-[#dadce0]">
              <div className="bg-[#e6f4ea] p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#34a853]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124] font-google-sans mb-2">
                Time Zone Management
              </h3>
              <p className="text-[#5f6368]">
                All times are displayed in Israel time (Asia/Jerusalem) with automatic handling of daylight saving time.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-[#f8f9fa] border-t border-[#dadce0] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[#5f6368]">
            &copy; {new Date().getFullYear()} Meeting Scheduler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
