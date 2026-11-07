import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import {
  getGremios,
  getGremioById,
  crearGremio,
  unirseGremio,
  crearInvitacion,
} from '../controllers/gremios.controller.js'

const router = Router()

router.get('/', real.realOrDemo(real.getGremios, getGremios))
router.get('/configuracion', real.getConfiguracion)
router.get('/:id', real.realOrDemo(real.getGremio, getGremioById))
router.patch('/:id/perfil', real.guardarPerfilGremio)
router.post('/', real.realOrDemo(real.crearGremio, crearGremio))
router.post('/unirse', real.realOrDemo(real.unirse, unirseGremio))

router.post('/:id/invitacion', real.crearInvitacion)
router.post('/:id/invitaciones', crearInvitacion)

export default router
