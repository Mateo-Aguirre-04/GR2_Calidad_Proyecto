import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'

const router = Router()

router.get('/:id?', real.getPerfil)
router.put('/:id/descripcion', real.guardarDescripcion)

export default router
