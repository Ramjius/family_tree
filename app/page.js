'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Upload, LogOut, ChevronDown, X, Image } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [filterRelation, setFilterRelation] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [currentFile, setCurrentFile] = useState(null)
  const [relationship, setRelationship] = useState('')
  const [personName, setPersonName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)

  const relationships = [
    'Self', 'Parent', 'Grandparent', 'Great-Grandparent',
    'Child', 'Grandchild', 'Sibling', 'Spouse/Partner',
    'Aunt/Uncle', 'Niece/Nephew', 'Cousin', 'Other Relative'
  ]

  useEffect(() => {
    checkUser()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadPhotos(session.user.id)
      } else {
        setUser(null)
        router.push('/auth')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      await loadPhotos(user.id)
    } else {
      router.push('/auth')
    }
    setLoading(false)
  }

  async function loadPhotos(userId) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const photosWithUrls = data.map(photo => ({
        ...photo,
        url: supabase.storage.from('family-photos').getPublicUrl(photo.storage_path).data.publicUrl
      }))
      setPhotos(photosWithUrls)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target.result
      setCurrentImage(imageData)
      setCurrentFile(file)
      setShowUploadModal(true)
      setIsAnalyzing(true)
      setImageError('')

      // Detect faces
      try {
        const response = await fetch('/api/detect-faces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData })
        })

        const result = await response.json()
        
        if (!result.isSinglePerson) {
          setImageError(result.message)
          setCurrentImage(null)
          setTimeout(() => {
            setShowUploadModal(false)
            setImageError('')
          }, 3000)
        }
      } catch (error) {
        setImageError('Error analyzing image')
      } finally {
        setIsAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function savePhoto() {
    if (!currentFile || !relationship || !personName || imageError) return

    setUploading(true)
    try {
      // Upload image to Supabase Storage
      const fileExt = currentFile.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('family-photos')
        .upload(fileName, currentFile)

      if (uploadError) throw uploadError

      // Save photo metadata to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          person_name: personName,
          relationship: relationship
        })

      if (dbError) throw dbError

      // Reload photos
      await loadPhotos(user.id)
      resetModal()
    } catch (error) {
      alert('Error uploading photo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function deletePhoto(photo) {
    if (!confirm('Delete this photo?')) return

    try {
      // Delete from storage
      await supabase.storage
        .from('family-photos')
        .remove([photo.storage_path])

      // Delete from database
      await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id)

      // Reload photos
      await loadPhotos(user.id)
    } catch (error) {
      alert('Error deleting photo: ' + error.message)
    }
  }

  function resetModal() {
    setShowUploadModal(false)
    setCurrentImage(null)
    setCurrentFile(null)
    setRelationship('')
    setPersonName('')
    setImageError('')
    setIsAnalyzing(false)
  }

  const filteredPhotos = filterRelation === 'all'
    ? photos
    : photos.filter(p => p.relationship === filterRelation)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Family Tree Album</h1>
                <p className="text-gray-600">Welcome back!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-5 h-5" />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleSignOut}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Filter */}
        {photos.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-gray-700 font-medium">Filter by relationship:</label>
              <div className="relative">
                <select
                  value={filterRelation}
                  onChange={(e) => setFilterRelation(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Family Members</option>
                  {relationships.map(rel => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <span className="text-gray-600 ml-auto">
                {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map(photo => (
              <div key={photo.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.person_name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{photo.person_name}</h3>
                  <p className="text-indigo-600 font-medium mb-1">{photo.relationship}</p>
                  <p className="text-gray-500 text-sm">Added {new Date(photo.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {photos.length === 0 ? 'No photos yet' : 'No photos match this filter'}
            </h3>
            <p className="text-gray-500">
              {photos.length === 0
                ? 'Start building your family tree by uploading your first photo'
                : 'Try selecting a different relationship filter'}
            </p>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Add Family Photo</h2>
                  <button
                    onClick={resetModal}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={isAnalyzing || uploading}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-700 font-medium">Analyzing image...</p>
                    <p className="text-gray-500 text-sm mt-1">Checking for single person photo</p>
                  </div>
                ) : imageError ? (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 font-medium">{imageError}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <img
                        src={currentImage}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm text-center">
                        ✓ Single person detected
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Person's Name *
                        </label>
                        <input
                          type="text"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          placeholder="Enter name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Relationship to You *
                        </label>
                        <select
                          value={relationship}
                          onChange={(e) => setRelationship(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select relationship...</option>
                          {relationships.map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={savePhoto}
                          disabled={!relationship || !personName || uploading}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                        >
                          {uploading ? 'Uploading...' : 'Save to Family Tree'}
                        </button>
                        <button
                          onClick={resetModal}
                          disabled={uploading}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}