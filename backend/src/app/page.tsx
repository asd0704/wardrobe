'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Plus, 
  Search, 
  Filter, 
  Heart, 
  Shirt, 
  Home, 
  BarChart3, 
  Settings,
  Upload,
  Clock,
  Eye,
  LogIn,
  UserPlus,
  Sparkles,
  Edit,
  Save,
  X,
  CheckCircle,
  Camera
} from 'lucide-react'

interface WardrobeItem {
  id: string
  name: string
  type: string
  colors: string[]
  season: string
  // new: support multiple occasions
  occasion?: string
  occasions?: string[]
  laundryStatus: string
  usageCount: number
  isFavorite: boolean
  thumbnailUrl: string
  objectUrl?: string
  createdAt: string
}

interface Outfit {
  id: string
  name: string
  description: string
  items: { item: WardrobeItem, position: number }[]
  isPublic: boolean
  createdAt: string
}

const typeColors = {
  TOP: 'bg-blue-100 text-blue-800',
  BOTTOM: 'bg-green-100 text-green-800',
  DRESS: 'bg-purple-100 text-purple-800',
  OUTERWEAR: 'bg-orange-100 text-orange-800',
  SHOES: 'bg-gray-100 text-gray-800',
  ACCESSORY: 'bg-pink-100 text-pink-800'
}

const laundryStatusColors = {
  IN_WARDROBE: 'bg-green-100 text-green-800',
  IN_LAUNDRY: 'bg-yellow-100 text-yellow-800',
  CLEAN: 'bg-blue-100 text-blue-800',
  AWAY: 'bg-red-100 text-red-800'
}

export default function DigitalWardrobe() {
  const { user, login, register, logout, isLoading } = useAuth()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [filteredItems, setFilteredItems] = useState<WardrobeItem[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedSeason, setSelectedSeason] = useState('ALL')
  const [selectedLaundryStatus, setSelectedLaundryStatus] = useState('ALL')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [selectedUploadType, setSelectedUploadType] = useState<string | null>(null)
  const [selectedUploadSeason, setSelectedUploadSeason] = useState<string | null>(null)
  const [selectedUploadOccasion, setSelectedUploadOccasion] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null)
  const [lastUploadedItemId, setLastUploadedItemId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showOutfitSuggestions, setShowOutfitSuggestions] = useState(false)
  const [outfitSuggestions, setOutfitSuggestions] = useState<any[]>([])
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [editItem, setEditItem] = useState<WardrobeItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<WardrobeItem>>({})
  const [isClient, setIsClient] = useState(false)
  const { toast } = useToast()

  const loadOutfits = async () => {
    try {
      const response = await fetch(`/api/outfits?userId=${user?.id}`, {
        headers: {
          'x-user-id': user?.id || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setOutfits(data)
      }
    } catch (error) {
      console.error('Error loading outfits:', error)
      toast({
        title: "Error",
        description: "Failed to load outfits.",
        variant: "destructive"
      })
    }
  }

  // Set isClient to true after component mounts to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load items when user is authenticated
  useEffect(() => {
    if (user && isClient) {
      loadItems()
      loadOutfits()
    }
  }, [user, isClient])

  useEffect(() => {
    if (!isClient) return
    
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'ALL') {
      filtered = filtered.filter(item => item.type === selectedType)
    }

    if (selectedSeason !== 'ALL') {
      filtered = filtered.filter(item => item.season === selectedSeason)
    }

    if (selectedLaundryStatus !== 'ALL') {
      filtered = filtered.filter(item => item.laundryStatus === selectedLaundryStatus)
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(item => item.isFavorite)
    }

    setFilteredItems(filtered)
  }, [items, searchTerm, selectedType, selectedSeason, selectedLaundryStatus, showFavoritesOnly, isClient])

  const loadItems = async () => {
    try {
      const response = await fetch(`/api/items?userId=${user?.id}`, {
        headers: {
          'x-user-id': user?.id || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Ensure each item has a colors array and map _id to id
        const itemsWithIds = data.map((item: any) => ({
          ...item,
          id: item._id,
          colors: item.colors || []
        }))
        setItems(itemsWithIds)
      }
    } catch (error) {
      console.error('Error loading items:', error)
      toast({
        title: "Error",
        description: "Failed to load wardrobe items.",
        variant: "destructive"
      })
    }
  }

  // Options for selects
  const TYPE_OPTIONS = [
    { id: 'TOP', label: 'Top' },
    { id: 'BOTTOM', label: 'Bottom' },
    { id: 'DRESS', label: 'Dress' },
    { id: 'OUTERWEAR', label: 'Outerwear' },
    { id: 'SHOES', label: 'Shoes' },
    { id: 'ACCESSORY', label: 'Accessory' },
    { id: 'UNIDENTIFIED', label: 'Unidentified' }
  ]

  const SEASON_OPTIONS = [
    { id: 'SPRING', label: 'Spring' },
    { id: 'SUMMER', label: 'Summer' },
    { id: 'FALL', label: 'Fall' },
    { id: 'WINTER', label: 'Winter' },
    { id: 'ALL_SEASON', label: 'All Season' },
    { id: 'UNIDENTIFIED', label: 'Unidentified' }
  ]

  const OCCASION_OPTIONS = [
    { id: 'CASUAL', label: 'Casual' },
    { id: 'FORMAL', label: 'Formal' },
    { id: 'SPORTS', label: 'Sports' },
    { id: 'PARTY', label: 'Party' },
    { id: 'UNIDENTIFIED', label: 'Unidentified' }
  ]

  // When AI analysis arrives, prefill selects. If AI suggests a generic value like ACCESSORY or ALL_SEASON
  // we map that to UNIDENTIFIED so the UI encourages the user to pick.
  useEffect(() => {
    if (!aiAnalysis) return

    const mapType = (t: string | undefined) => {
      if (!t) return 'UNIDENTIFIED'
      const normalized = t.toUpperCase()
      if (normalized === 'ACCESSORY' || normalized === 'UNKNOWN') return 'UNIDENTIFIED'
      return TYPE_OPTIONS.find(o => o.id === normalized) ? normalized : 'UNIDENTIFIED'
    }

    const mapSeason = (s: string | undefined) => {
      if (!s) return 'UNIDENTIFIED'
      const normalized = s.toUpperCase()
      if (normalized === 'ALL_SEASON' || normalized === 'UNKNOWN') return 'UNIDENTIFIED'
      return SEASON_OPTIONS.find(o => o.id === normalized) ? normalized : 'UNIDENTIFIED'
    }

    const mapOccasions = (o: string | string[] | undefined) => {
      if (!o) return []
      // If AI returns a comma-separated string, split it
      if (Array.isArray(o)) return o.map(x => String(x).toUpperCase()).filter(x => OCCASION_OPTIONS.find(opt => opt.id === x))
      const normalized = String(o).toUpperCase()
      // split on commas or slashes
      const parts = normalized.split(/[,/]+/).map(p => p.trim()).filter(Boolean)
      const mapped = parts.map(p => OCCASION_OPTIONS.find(opt => opt.id === p) ? p : null).filter(Boolean) as string[]
      return mapped
    }

    setSelectedUploadType(mapType(aiAnalysis.type))
    setSelectedUploadSeason(mapSeason(aiAnalysis.season))
    setSelectedUploadOccasion(mapOccasions(aiAnalysis.occasion))
  }, [aiAnalysis])

  const handleLogin = async () => {
    try {
      const success = await login(authForm.email, authForm.password)
      if (success) {
        setShowLogin(false)
        setAuthForm({ email: '', password: '', name: '' })
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        })
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password. Please check your credentials and try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Login failed",
        description: "An error occurred. Please try again later.",
        variant: "destructive"
      })
    }
  }

  const handleRegister = async () => {
    try {
      // Validate password length
      if (authForm.password.length < 6) {
        toast({
          title: "Registration failed",
          description: "Password must be at least 6 characters long.",
          variant: "destructive"
        })
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(authForm.email)) {
        toast({
          title: "Registration failed",
          description: "Please enter a valid email address.",
          variant: "destructive"
        })
        return
      }

      const success = await register(authForm.email, authForm.password, authForm.name)
      if (success) {
        setShowRegister(false)
        setAuthForm({ email: '', password: '', name: '' })
        toast({
          title: "Account created!",
          description: "Welcome to Digital Wardrobe.",
        })
      } else {
        toast({
          title: "Registration failed",
          description: "Email may already be in use or an error occurred. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast({
        title: "Registration failed",
        description: "An error occurred. Please try again later.",
        variant: "destructive"
      })
    }
  }

  const handleUpload = async (file: File) => {
    if (!user) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('Initializing upload...')
    setAiAnalysis(null)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', user.id)
  // Do NOT send the original filename to avoid exposing user's file name in the UI
  // Send an empty name to let the server choose a neutral default
  formData.append('name', '')
  // Use safe defaults so the item can be saved; user can change them after upload
  formData.append('type', 'ACCESSORY')
  formData.append('occasion', 'CASUAL')
  formData.append('season', 'ALL_SEASON')

    try {
      setUploadStatus('Uploading file...')
      setUploadProgress(20)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setUploadProgress(60)
        setUploadStatus('Processing with AI...')
        
        // Simulate AI processing progress
        setTimeout(() => {
          setUploadProgress(80)
          setUploadStatus('Analyzing colors and patterns...')
        }, 500)

        setTimeout(() => {
          setUploadProgress(90)
          setUploadStatus('Finalizing analysis...')
        }, 1000)

        setTimeout(() => {
          setUploadProgress(100)
          setUploadStatus('Complete!')
          // Prefill manual selects with the safe defaults so user can adjust and save
          setAiAnalysis(null)
          setSelectedUploadType('ACCESSORY')
          setSelectedUploadOccasion(['CASUAL'])
          setSelectedUploadSeason('ALL_SEASON')
          setLastUploadedItemId(data.item?.id || null)
          loadItems() // Reload items so the uploaded item appears in the list

          toast({
            title: "Item uploaded successfully!",
            description: `Upload complete — please choose category/season/occasion and click Save`,
          })
        }, 1500)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your item.",
        variant: "destructive"
      })
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadStatus('')
        // keep aiAnalysis visible so user can confirm or change values
      }, 2000)
    }
  }

  const saveUploadedItemChanges = async () => {
    if (!user || !lastUploadedItemId) return

    try {
      const body: any = {}
      if (selectedUploadType) body.type = selectedUploadType
      // send occasions as an array
      if (selectedUploadOccasion && selectedUploadOccasion.length > 0) body.occasions = selectedUploadOccasion
      if (selectedUploadSeason) body.season = selectedUploadSeason

      const response = await fetch(`/api/items/${lastUploadedItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await loadItems()
        toast({ title: 'Saved', description: 'Item categories updated.' })
        setAiAnalysis(null)
        setLastUploadedItemId(null)
      } else {
        const data = await response.json()
        throw new Error(data?.error || 'Failed to update item')
      }
    } catch (error) {
      console.error('Save changes error:', error)
      toast({ title: 'Update failed', description: 'Could not save changes', variant: 'destructive' })
    }
  }

  const toggleFavorite = async (itemId: string) => {
    if (!user) return

    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          isFavorite: !item.isFavorite
        })
      })

      if (response.ok) {
        await loadItems()
        toast({
          title: "Updated favorites",
          description: "Item has been added to your favorites.",
        })
      }
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const markAsLaundry = async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}/laundry`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          action: 'mark_laundry'
        })
      })

      if (response.ok) {
        await loadItems()
        toast({
          title: "Marked for laundry",
          description: "Item has been moved to laundry.",
        })
      }
    } catch (error) {
      console.error('Error updating laundry status:', error)
    }
  }

  const markLaundryAsDone = async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}/laundry`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          action: 'mark_clean'
        })
      })

      if (response.ok) {
        await loadItems()
        toast({
          title: "Laundry done!",
          description: "Item has been marked as clean and ready to use.",
        })
      }
    } catch (error) {
      console.error('Error updating laundry status:', error)
      toast({
        title: "Update failed",
        description: "There was an error updating the laundry status.",
        variant: "destructive"
      })
    }
  }

  const generateOutfitSuggestions = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/outfits/suggest', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: user.id,
          occasion: 'CASUAL',
          season: 'ALL_SEASON',
          weather: 'Mild',
          style: 'Casual'
        })
      })

      const data = await response.json()

      if (data.success) {
        setOutfitSuggestions(data.suggestions)
        setShowOutfitSuggestions(true)
        
        if (data.fallback) {
          toast({
            title: "Basic suggestions generated",
            description: "AI service unavailable, showing simple combinations.",
            variant: "default"
          })
        } else {
          toast({
            title: "AI outfit suggestions ready!",
            description: "Personalized outfits created just for you.",
          })
        }
      }
    } catch (error) {
      console.error('Error generating outfit suggestions:', error)
      toast({
        title: "Failed to generate suggestions",
        description: "Please try again later.",
        variant: "destructive"
      })
    }
  }

  const startEditItem = (item: WardrobeItem) => {
    setEditItem(item)
    setEditForm({
      name: item.name,
      type: item.type,
      season: item.season,
      occasion: item.occasion,
      colors: [...(item.colors || [])] // Ensure colors array exists
    })
  }

  const saveEditItem = async () => {
    if (!user || !editItem) return

    try {
      const response = await fetch(`/api/items/${editItem.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          ...editForm
        })
      })

      if (response.ok) {
        await loadItems()
        setEditItem(null)
        setEditForm({})
        toast({
          title: "Item updated",
          description: "Your item details have been saved.",
        })
      }
    } catch (error) {
      console.error('Error updating item:', error)
      toast({
        title: "Update failed",
        description: "There was an error updating your item.",
        variant: "destructive"
      })
    }
  }

  const cancelEdit = () => {
    setEditItem(null)
    setEditForm({})
  }

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...(editForm.colors || [])]
    newColors[index] = value
    setEditForm({ ...editForm, colors: newColors })
  }

  const addColor = () => {
    setEditForm({
      ...editForm,
      colors: [...(editForm.colors || []), '']
    })
  }

  const removeColor = (index: number) => {
    const newColors = [...(editForm.colors || [])]
    newColors.splice(index, 1)
    setEditForm({ ...editForm, colors: newColors })
  }

  const markAsWorn = async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}/laundry`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          action: 'mark_worn'
        })
      })

      if (response.ok) {
        await loadItems()
        toast({
          title: "Item marked as worn",
          description: "Usage count has been updated.",
        })
      }
    } catch (error) {
      console.error('Error marking item as worn:', error)
      toast({
        title: "Update failed",
        description: "There was an error updating the item.",
        variant: "destructive"
      })
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      })

      if (response.ok) {
        await loadItems()
        setSelectedItem(null)
        toast({
          title: "Item deleted",
          description: "The item has been removed from your wardrobe.",
        })
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Delete failed",
        description: "There was an error deleting the item.",
        variant: "destructive"
      })
    }
  }

  // Generate a unique key for an item
  const getItemKey = (item: WardrobeItem, index: number) => {
    return item.id || `item-${index}-${item.name}`
  }

  // Show loading state while checking authentication
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shirt className="mx-auto h-12 w-12 text-indigo-600 animate-pulse" />
          <p className="mt-2 text-gray-600">Loading Digital Wardrobe...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shirt className="h-12 w-12 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl">Digital Wardrobe</CardTitle>
            <p className="text-gray-600">Manage your smart clothing collection</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={showLogin} onOpenChange={setShowLogin}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign In</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button onClick={handleLogin} className="w-full">
                    Sign In
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showRegister} onOpenChange={setShowRegister}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="register-name">Name (Optional)</Label>
                    <Input
                      id="register-name"
                      value={authForm.name}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a password"
                    />
                  </div>
                  <Button onClick={handleRegister} className="w-full">
                    Create Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shirt className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">Digital Wardrobe</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name || user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="search"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="TOP">Tops</SelectItem>
                      <SelectItem value="BOTTOM">Bottoms</SelectItem>
                      <SelectItem value="DRESS">Dresses</SelectItem>
                      <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
                      <SelectItem value="SHOES">Shoes</SelectItem>
                      <SelectItem value="ACCESSORY">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="season">Season</Label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger>
                      <SelectValue placeholder="All seasons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Seasons</SelectItem>
                      <SelectItem value="SPRING">Spring</SelectItem>
                      <SelectItem value="SUMMER">Summer</SelectItem>
                      <SelectItem value="FALL">Fall</SelectItem>
                      <SelectItem value="WINTER">Winter</SelectItem>
                      <SelectItem value="ALL_SEASON">All Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="laundry">Laundry Status</Label>
                  <Select value={selectedLaundryStatus} onValueChange={setSelectedLaundryStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="IN_WARDROBE">In Wardrobe</SelectItem>
                      <SelectItem value="IN_LAUNDRY">In Laundry</SelectItem>
                      <SelectItem value="CLEAN">Clean</SelectItem>
                      <SelectItem value="AWAY">Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="favorites"
                    checked={showFavoritesOnly}
                    onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="favorites">Favorites only</Label>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Wardrobe Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>In Laundry:</span>
                  <span className="font-semibold text-yellow-600">
                    {items.filter(i => i.laundryStatus === 'IN_LAUNDRY').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Favorites:</span>
                  <span className="font-semibold text-red-600">
                    {items.filter(i => i.isFavorite).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Wardrobe</h2>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={generateOutfitSuggestions}
                  disabled={items.length < 2}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Outfits
                </Button>
                
                {/* Upload Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Upload Options */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Upload from Device */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                          <label htmlFor="file-upload" className="cursor-pointer block">
                            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-900 block">
                              Upload Image
                            </span>
                            <span className="text-xs text-gray-500 block mt-1">
                              From device
                            </span>
                          </label>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(file)
                            }}
                          />
                        </div>

                        {/* Camera Capture */}
                        <div 
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                          onClick={() => {
                            const cameraInput = document.getElementById('camera-capture')
                            cameraInput?.click()
                          }}
                        >
                          <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-900 block">
                            Take Photo
                          </span>
                          <span className="text-xs text-gray-500 block mt-1">
                            Use camera
                          </span>
                          <input
                            id="camera-capture"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(file)
                            }}
                          />
                        </div>
                      </div>

                      {/* Drag-and-drop area removed per request; users can Upload Image or Take Photo */}
                      
                      {isUploading && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{uploadStatus}</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="w-full" />
                          </div>
                          
                          {aiAnalysis && (
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                              <h4 className="font-medium text-sm">AI Analysis Results:</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-medium">Name:</span>
                                  <p className="text-gray-600">{aiAnalysis.name}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Type:</span>
                                  <p className="text-gray-600">{aiAnalysis.type}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Occasion:</span>
                                  <p className="text-gray-600">{aiAnalysis.occasion}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Season:</span>
                                  <p className="text-gray-600">{aiAnalysis.season}</p>
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Colors:</span>
                                  <div className="flex gap-1 mt-1">
                                    {aiAnalysis.colors.map((color: string, index: number) => (
                                      <Badge key={`ai-color-${index}`} variant="secondary" className="text-xs">
                                        {color}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Manual selection UI after upload (AI disabled) */}
                      <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                          <h4 className="font-medium text-sm">Provide item details</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <Label>Category / Type</Label>
                                {/* Quick suggestion chips: show detected type first, then two other options for quick selection */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {[selectedUploadType, ...TYPE_OPTIONS.map(o=>o.id).filter(id=>id !== selectedUploadType).slice(0,2)].filter(Boolean).map((candidate) => (
                                    <Button key={`type-sugg-${candidate}`} size="sm" variant={candidate === selectedUploadType ? 'default' : 'outline'} onClick={() => setSelectedUploadType(candidate as string)}>
                                      {TYPE_OPTIONS.find(t => t.id === candidate)?.label || candidate}
                                    </Button>
                                  ))}
                                </div>
                                <Select value={selectedUploadType || 'UNIDENTIFIED'} onValueChange={(v) => setSelectedUploadType(v)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TYPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                                            <div>
                              <Label>Occasion</Label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {OCCASION_OPTIONS.map(opt => {
                                  const isSelected = selectedUploadOccasion.includes(opt.id)
                                  return (
                                    <Button
                                      key={`occasion-chip-${opt.id}`}
                                      size="sm"
                                      variant={isSelected ? 'default' : 'outline'}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedUploadOccasion(prev => prev.filter(x => x !== opt.id))
                                        } else {
                                          setSelectedUploadOccasion(prev => [...prev, opt.id])
                                        }
                                      }}
                                    >
                                      {opt.label}
                                    </Button>
                                  )
                                })}
                              </div>
                              <p className="text-xs text-gray-500">Select one or more occasions that apply.</p>
                            </div>
                            <div>
                              <Label>Season</Label>
                                {/* quick season suggestions */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {[selectedUploadSeason, ...SEASON_OPTIONS.map(o=>o.id).filter(id=>id !== selectedUploadSeason).slice(0,2)].filter(Boolean).map((candidate) => (
                                    <Button key={`season-sugg-${candidate}`} size="sm" variant={candidate === selectedUploadSeason ? 'default' : 'outline'} onClick={() => setSelectedUploadSeason(candidate as string)}>
                                      {SEASON_OPTIONS.find(t => t.id === candidate)?.label || candidate}
                                    </Button>
                                  ))}
                                </div>
                                <Select value={selectedUploadSeason || 'UNIDENTIFIED'} onValueChange={(v) => setSelectedUploadSeason(v)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select season" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SEASON_OPTIONS.map(opt => (
                                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="pt-2">
                              <Button onClick={saveUploadedItemChanges} disabled={!lastUploadedItemId}>
                                {lastUploadedItemId ? 'Save selections' : 'Upload first to enable Save'}
                              </Button>
                            </div>
                          </div>
                        </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item, index) => (
                <Card key={getItemKey(item, index)} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Heart
                        className={`h-4 w-4 ${item.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                      />
                    </Button>
                    <Badge
                      className={`absolute top-2 left-2 ${laundryStatusColors[item.laundryStatus as keyof typeof laundryStatusColors]}`}
                      variant="secondary"
                    >
                      {item.laundryStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">{item.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge className={typeColors[item.type as keyof typeof typeColors]} variant="secondary">
                        {item.type}
                      </Badge>
                      <Badge variant="outline">{item.season}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.usageCount} uses
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {item.laundryStatus === 'IN_LAUNDRY' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markLaundryAsDone(item.id)}
                          className="bg-green-50 hover:bg-green-100 border-green-300"
                        >
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsLaundry(item.id)}
                          disabled={item.laundryStatus === 'IN_LAUNDRY'}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Shirt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your filters or add new items to your wardrobe.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedItem.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={selectedItem.thumbnailUrl}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-gray-600">{selectedItem.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Season</Label>
                  <p className="text-sm text-gray-600">{selectedItem.season}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Occasion</Label>
                  <p className="text-sm text-gray-600">{(selectedItem.occasions && selectedItem.occasions.length > 0) ? selectedItem.occasions.join(', ') : selectedItem.occasion}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Usage Count</Label>
                  <p className="text-sm text-gray-600">{selectedItem.usageCount} times</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Colors</Label>
                <div className="flex gap-2 mt-1">
                  {selectedItem.colors && selectedItem.colors.length > 0 ? (
                    selectedItem.colors.map((color, index) => (
                      <Badge key={`item-color-${index}-${selectedItem.id}`} variant="secondary">{color}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No colors specified</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => markAsWorn(selectedItem.id)}>
                    Mark as Worn
                  </Button>
                  <Button variant="outline" onClick={() => startEditItem(selectedItem)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteItem(selectedItem.id)}>
                    Delete
                  </Button>
                </div>
                {selectedItem.laundryStatus === 'IN_LAUNDRY' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => markLaundryAsDone(selectedItem.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Laundry as Done
                  </Button>
                )}
                {selectedItem.laundryStatus !== 'IN_LAUNDRY' && selectedItem.laundryStatus !== 'CLEAN' && (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => markAsLaundry(selectedItem.id)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark for Laundry
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Edit form fields */}
              <div>
                <Label htmlFor="edit-season">Season</Label>
                <Select value={editForm.season || ''} onValueChange={(value) => setEditForm({ ...editForm, season: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPRING">Spring</SelectItem>
                    <SelectItem value="SUMMER">Summer</SelectItem>
                    <SelectItem value="FALL">Fall</SelectItem>
                    <SelectItem value="WINTER">Winter</SelectItem>
                    <SelectItem value="ALL_SEASON">All Season</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-occasion">Occasion</Label>
                <Select value={editForm.occasion || ''} onValueChange={(value) => setEditForm({ ...editForm, occasion: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASUAL">Casual</SelectItem>
                    <SelectItem value="FORMAL">Formal</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="SPORT">Sport</SelectItem>
                    <SelectItem value="PARTY">Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Colors</Label>
                <div className="space-y-2 mt-1">
                  {editForm.colors && editForm.colors.map((color, index) => (
                    <div key={`edit-color-${index}`} className="flex gap-2">
                      <Input
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        placeholder="Color name"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeColor(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addColor}
                  >
                    Add Color
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveEditItem} className="flex-1">
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Outfit Suggestions Dialog */}
      {showOutfitSuggestions && (
        <Dialog open={showOutfitSuggestions} onOpenChange={setShowOutfitSuggestions}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Outfit Suggestions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {outfitSuggestions.map((outfit, index) => (
                <Card key={`outfit-${index}`} className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="text-lg">{outfit.name}</CardTitle>
                    <p className="text-sm text-gray-600">{outfit.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {(outfit.itemIds || outfit.items || []).map((itemId: string) => {
                        // Try to find item by id (could be string or ObjectId)
                        const item = items.find(i => 
                          i.id === itemId || 
                          i.id === itemId.toString() || 
                          i.id?.toString() === itemId?.toString()
                        )
                        if (!item) {
                          console.warn(`Item not found for ID: ${itemId}`)
                          return null
                        }
                        
                        return (
                          <div key={`outfit-item-${itemId}-${index}`} className="text-center">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                              <img
                                src={item.thumbnailUrl || item.objectUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to objectUrl if thumbnail fails
                                  const target = e.target as HTMLImageElement
                                  if (item.objectUrl && target.src !== item.objectUrl) {
                                    target.src = item.objectUrl
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.type}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>Why this works:</strong> {outfit.reasoning}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {outfitSuggestions.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions available</h3>
                  <p className="text-gray-600">Add more items to your wardrobe to get AI-powered outfit suggestions.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}