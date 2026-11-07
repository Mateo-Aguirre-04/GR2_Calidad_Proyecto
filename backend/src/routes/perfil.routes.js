import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { getPerfil, guardarDescripcion } from '../controllers/perfil.controller.js'

const router = Router()

router.get('/:id?', real.realOrDemo(real.getPerfil, getPerfil))
router.put('/:id/descripcion', real.realOrDemo(real.guardarDescripcion, guardarDescripcion))

export default router
