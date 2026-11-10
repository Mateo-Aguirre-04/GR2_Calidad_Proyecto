import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'

const router = Router()

router.get('/', real.getGremios)
router.get('/configuracion', real.getConfiguracion)
router.get('/:id', real.getGremio)
router.patch('/:id/perfil', real.guardarPerfilGremio)
router.post('/', real.crearGremio)
router.post('/unirse', real.unirse)

router.post('/:id/invitacion', real.crearInvitacion)

export default router
