"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { companies as defaultCompanies, type Company } from "@/lib/company-data"
import { Search, Plus, Loader2, X } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Treemap, Tooltip, Legend } from "recharts"

interface CloudDependencyExplorerProps {
  onOpenRegions?: () => void
}

export function CloudDependencyExplorer({ onOpenRegions }: CloudDependencyExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [customCompanies, setCustomCompanies] = useState<Company[]>([])
  const [newCompanyUrl, setNewCompanyUrl] = useState("")
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  // Combine default and custom companies
  const allCompanies = useMemo(() => {
    return [...defaultCompanies, ...customCompanies]
  }, [customCompanies])

  const filteredCompanies = useMemo(() => {
    return allCompanies.filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProvider = !selectedProvider || company.provider === selectedProvider
      return matchesSearch && matchesProvider
    })
  }, [allCompanies, searchQuery, selectedProvider])

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allCompanies.forEach((company) => {
      counts[company.provider] = (counts[company.provider] || 0) + 1
    })
    return counts
  }, [allCompanies])

  const handleAddCompany = async () => {
    if (!newCompanyUrl.trim()) return

    setIsDetecting(true)
    setDetectionError(null)

    try {
      // Extract domain from URL
      let domain = newCompanyUrl.trim()
      if (domain.startsWith("http://") || domain.startsWith("https://")) {
        domain = new URL(domain).hostname
      }
      domain = domain.replace("www.", "")

      // Check if company already exists
      if (allCompanies.some((c) => c.domain === domain)) {
        setDetectionError("Company already exists")
        setIsDetecting(false)
        return
      }

      // Call detection API
      const response = await fetch("/api/detect-cloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newCompanyUrl.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to detect cloud provider")
      }

      const result = await response.json()

      // Extract company name from domain
      const name = domain.split(".")[0]
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1)

      // Add new company
      const newCompany: Company = {
        name: formattedName,
        symbol: "CUSTOM",
        domain,
        provider: result.provider,
      }

      setCustomCompanies((prev) => [...prev, newCompany])
      setNewCompanyUrl("")
    } catch (error) {
      console.error("[v0] Error adding company:", error)
      setDetectionError("Failed to detect cloud provider. Please try again.")
    } finally {
      setIsDetecting(false)
    }
  }

  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null)

  const COLORS = {
    AWS: "#ff9900",
    Azure: "#0089d6",
    GCP: "#4285f4",
    Oracle: "#f80000",
    Alibaba: "#ff6a00",
    Other: "#6b7280",
  }

  const PROVIDER_LOGOS = {
    AWS: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    Azure: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Microsoft_Azure_Logo.svg",
    GCP: "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
    Oracle: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
    Alibaba: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Alibaba_Cloud_logo.png",
  }

  const PROVIDER_DISPLAY_NAMES = {
    AWS: "AWS",
    Azure: "Azure",
    GCP: "Google Cloud",
    Oracle: "Oracle",
    Alibaba: "Alibaba Cloud",
    Other: "Other",
  }

  const pieData = useMemo(() => {
    return Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        color: COLORS[name as keyof typeof COLORS] || COLORS.Other,
      }))
  }, [providerCounts])

  const displayedCompanies = useMemo(() => {
    if (hoveredProvider) {
      return allCompanies.filter((c) => c.provider === hoveredProvider)
    }
    return filteredCompanies
  }, [hoveredProvider, filteredCompanies, allCompanies])

  const handleSearch = async (value: string) => {
    setSearchQuery(value)
    
    // If it looks like a URL or domain, try to add it
    if (value.includes('.') && value.length > 3 && !allCompanies.some(c => c.name.toLowerCase().includes(value.toLowerCase()))) {
      // Auto-trigger detection after short delay
      const timer = setTimeout(() => {
        setNewCompanyUrl(value)
      }, 500)
      return () => clearTimeout(timer)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 text-center px-4 relative pt-12 sm:pt-16">
          {onOpenRegions && (
            <button
              onClick={onOpenRegions}
              className="absolute top-2 right-4 sm:right-8 sm:top-4 flex items-center gap-2 px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 z-10"
              title="Explore AWS Regions"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">AWS Regions</span>
              <span className="sm:hidden">Regions</span>
            </button>
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-3 break-words">
            Who Controls <span className="text-orange-500">The Internet?</span>
          </h1>
          <p className="text-gray-600 text-base sm:text-lg px-2">
            When AWS goes down, Netflix, Reddit, and Slack go with it.
          </p>
        </div>

        {/* Single Search Bar */}
        <div className="mb-6 max-w-2xl mx-auto px-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
            <Input
              type="text"
              placeholder="Search companies or add new ones (e.g., 'Netflix' or 'stripe.com')..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.includes('.')) {
                  setNewCompanyUrl(searchQuery)
                  handleAddCompany()
                }
              }}
              className="pl-12 pr-12 h-14 border-2 border-gray-300 text-base bg-white shadow-lg rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedProvider(null)
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                aria-label="Clear search"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {detectionError && (
            <div className="mt-2 text-sm text-red-600 text-center">{detectionError}</div>
          )}
        </div>

        {/* Provider Filter Pills with LOGOS */}
        <div className="mb-6 flex flex-wrap gap-3 justify-center px-4">
          {Object.entries(providerCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([provider, count]) => {
              const isSelected = selectedProvider === provider
              const logo = PROVIDER_LOGOS[provider as keyof typeof PROVIDER_LOGOS]
              const displayName = PROVIDER_DISPLAY_NAMES[provider as keyof typeof PROVIDER_DISPLAY_NAMES] || provider
              return (
                <button
                  key={provider}
                  className={`px-4 py-2.5 rounded-xl font-semibold transition-all border-2 flex items-center gap-2 ${
                    isSelected 
                      ? "ring-4 ring-offset-2 scale-105 shadow-xl transform" 
                      : "hover:scale-105 hover:shadow-lg shadow-md"
                  }`}
                  style={{
                    backgroundColor: isSelected ? COLORS[provider as keyof typeof COLORS] : "white",
                    borderColor: COLORS[provider as keyof typeof COLORS],
                    borderWidth: isSelected ? "3px" : "2px",
                    color: isSelected ? "white" : COLORS[provider as keyof typeof COLORS],
                  }}
                  onClick={() => setSelectedProvider(isSelected ? null : provider)}
                  onMouseEnter={() => setHoveredProvider(provider)}
                  onMouseLeave={() => setHoveredProvider(null)}
                  aria-pressed={isSelected}
                  title={`Filter by ${displayName}`}
                >
                  {logo && (
                    <img 
                      src={logo} 
                      alt={provider} 
                      className="h-5 w-auto flex-shrink-0" 
                      style={{ filter: isSelected ? "brightness(0) invert(1)" : "none" }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="text-sm whitespace-nowrap">{displayName}</span>
                  <span className="text-xs opacity-75 whitespace-nowrap">({count})</span>
                  {isSelected && (
                    <X 
                      className="h-4 w-4 ml-1 opacity-75 hover:opacity-100" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProvider(null)
                      }}
                    />
                  )}
                </button>
              )
            })}
        </div>

        {/* Main Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart with Hover */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Cloud Provider Market Share</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const displayName = PROVIDER_DISPLAY_NAMES[name as keyof typeof PROVIDER_DISPLAY_NAMES] || name
                    return `${displayName} ${(percent * 100).toFixed(0)}%`
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  onMouseEnter={(data) => setHoveredProvider(data.name)}
                  onMouseLeave={() => setHoveredProvider(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      onClick={() => setSelectedProvider(selectedProvider === entry.name ? null : entry.name)}
                      style={{ cursor: "pointer" }}
                      opacity={
                        hoveredProvider 
                          ? hoveredProvider === entry.name ? 1 : 0.3
                          : selectedProvider && selectedProvider !== entry.name ? 0.3 : 1
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="text-6xl font-black text-blue-600">
                {Math.round(((providerCounts["AWS"] || 0) + (providerCounts["Azure"] || 0) + (providerCounts["GCP"] || 0)) / allCompanies.length * 100)}%
              </div>
              <div className="text-sm text-gray-600 font-medium">The Big 3 Control Everything</div>
            </div>
          </div>

          {/* All Company Logos - Scrollable */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {hoveredProvider || selectedProvider 
                  ? `${PROVIDER_DISPLAY_NAMES[(hoveredProvider || selectedProvider) as keyof typeof PROVIDER_DISPLAY_NAMES] || (hoveredProvider || selectedProvider)} Companies` 
                  : "All Companies"} ({displayedCompanies.length})
              </h2>
              {(selectedProvider || hoveredProvider) && (
                <button 
                  onClick={() => {
                    setSelectedProvider(null)
                    setHoveredProvider(null)
                  }} 
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs flex items-center gap-1 transition-colors shadow-md hover:shadow-lg"
                >
                  <X className="h-3 w-3" />
                  Clear Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {displayedCompanies.map((company) => (
                <div
                  key={company.domain}
                  className="relative bg-gray-50 rounded-lg p-2 border-2 hover:scale-110 transition-transform cursor-pointer"
                  style={{ borderColor: COLORS[company.provider as keyof typeof COLORS] }}
                  title={`${company.name} - ${company.provider}`}
                >
                  <img
                    src={`https://logo.clearbit.com/${company.domain}`}
                    alt={company.name}
                    className="w-full h-full object-contain aspect-square"
                    onError={(e) => {
                      const target = e.currentTarget
                      if (target.src.includes('clearbit')) {
                        target.src = `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`
                      } else if (target.src.includes('google.com')) {
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random&size=128`
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
