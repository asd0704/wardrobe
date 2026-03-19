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
  X
} from 'lucide-react'

interface WardrobeItem {
  id: string
  name: string
  type: string
  colors: string[]
  season: string
  occasion: string
  laundryStatus: string
  usageCount: number
  isFavorite: boolean
  thumbnailUrl: string
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
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null)
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

  const handleLogin = async () => {
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
        description: "Invalid email or password.",
        variant: "destructive"
      })
    }
  }

  const handleRegister = async () => {
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
        description: "Email may already be in use.",
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
    formData.append('name', file.name.split('.')[0])
    formData.append('type', 'TOP')
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
          setAiAnalysis(data.aiAnalysis)
          loadItems() // Reload items
          
          toast({
            title: "Item uploaded successfully!",
            description: `AI detected: ${data.aiAnalysis.colors.join(', ')} ${data.aiAnalysis.type.toLowerCase()}`,
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
        setAiAnalysis(null)
      }, 2000)
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              Click to upload or drag and drop
                            </span>
                            <span className="mt-1 block text-xs text-gray-500">
                              PNG, JPG, GIF up to 10MB
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
                      </div>
                      
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsLaundry(item.id)}
                        disabled={item.laundryStatus === 'IN_LAUNDRY'}
                      >
                        <Clock className="h-3 w-3" />
                      </Button>
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
                  <p className="text-sm text-gray-600">{selectedItem.occasion}</p>
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
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={cancelEdit}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={editForm.type || ''} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOP">Top</SelectItem>
                    <SelectItem value="BOTTOM">Bottom</SelectItem>
                    <SelectItem value="DRESS">Dress</SelectItem>
                    <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
                    <SelectItem value="SHOES">Shoes</SelectItem>
                    <SelectItem value="ACCESSORY">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                      {outfit.items.map((itemId: string) => {
                        const item = items.find(i => i.id === itemId)
                        if (!item) return null
                        
                        return (
                          <div key={`outfit-item-${itemId}`} className="text-center">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
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