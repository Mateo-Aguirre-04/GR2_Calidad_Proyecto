import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Extraer project id de DATABASE_URL si no está definido SUPABASE_URL
let supabaseUrl = process.env.SUPABASE_URL
if (!supabaseUrl && process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/postgres\.([a-zA-Z0-9_-]+):/)
  if (match) {
    supabaseUrl = `https://${match[1]}.supabase.co`
  }
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Faltan credenciales para subir archivos al Storage de Supabase.')
  console.log('Detectado URL:', supabaseUrl || 'No encontrada')
  console.log('Se necesita la clave de API (service_role o anon key) en backend/.env:')
  console.log('   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const BUCKET = 'huertos-assets'
const BASE_DIR = path.resolve(__dirname, '../storage/plantas')

async function uploadAll() {
  console.log(`\nIniciando subida al bucket "${BUCKET}/plantas" en ${supabaseUrl}...\n`)

  const folders = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  let totalFiles = 0
  let uploaded = 0
  let errors = 0

  for (const folder of folders) {
    const folderPath = path.join(BASE_DIR, folder)
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'))
    totalFiles += files.length

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const fileBuffer = fs.readFileSync(filePath)
      const storagePath = `plantas/${folder}/${file}`

      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          })

        if (error) {
          console.error(`❌ Error al subir ${storagePath}:`, error.message)
          errors++
        } else {
          uploaded++
          process.stdout.write(`\r✅ Subidos: ${uploaded}/${totalFiles} (${storagePath})`)
        }
      } catch (err) {
        console.error(`\n❌ Excepción al subir ${storagePath}:`, err.message)
        errors++
      }
    }
  }

  console.log(`\n\n=== Resumen de subida ===`)
  console.log(`Total archivos: ${totalFiles}`)
  console.log(`Subidos exitosamente: ${uploaded}`)
  console.log(`Errores: ${errors}`)
}

uploadAll()
