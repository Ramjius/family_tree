import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to upload image
export async function uploadImage(file, userId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Math.random()}.${fileExt}`
  const filePath = fileName

  const { data, error } = await supabase.storage
    .from('family-photos')
    .upload(filePath, file)

  if (error) throw error
  return filePath
}

// Helper function to get image URL
export function getImageUrl(path) {
  const { data } = supabase.storage
    .from('family-photos')
    .getPublicUrl(path)
  
  return data.publicUrl
}

// Helper function to delete image
export async function deleteImage(path) {
  const { error } = await supabase.storage
    .from('family-photos')
    .remove([path])

  if (error) throw error
}