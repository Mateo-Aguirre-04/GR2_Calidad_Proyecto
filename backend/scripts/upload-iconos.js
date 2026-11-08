import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

let supabaseUrl = process.env.SUPABASE_URL
if (!supabaseUrl && process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/postgres\.([a-zA-Z0-9_-]+):/)
  if (match) {
    supabaseUrl = `https://${match[1]}.supabase.co`
  }
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const BUCKET = 'huertos-assets'
const ICONS_DIR = path.resolve(__dirname, '../../huertos-ecuador/src/assets/iconos')

const files = ['suelo.svg', 'ambiente.svg', 'abono.svg', 'extras.svg']

async function upload() {
  console.log(`Subiendo iconos a ${BUCKET} en ${supabaseUrl}...`)

  const folders = ['iconos', 'cuidados']

  for (const folder of folders) {
    for (const file of files) {
      const filePath = path.join(ICONS_DIR, file)
      if (!fs.existsSync(filePath)) {
        console.warn(`Archivo no encontrado: ${filePath}`)
        continue
      }
      const fileBuffer = fs.readFileSync(filePath)
      const storagePath = `${folder}/${file}`

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        })

      if (error) {
        console.error(`❌ Error al subir ${storagePath}:`, error.message)
      } else {
        const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        console.log(`✅ Subido: ${pubData.publicUrl}`)
      }
    }
  }
}

upload().catch(console.error)
