import { Router } from 'express'
import { getPerfil, guardarDescripcion } from '../controllers/perfil.controller.js'

const router = Router()

router.get('/:id?', getPerfil)
router.put('/:id/descripcion', guardarDescripcion)

export default router
