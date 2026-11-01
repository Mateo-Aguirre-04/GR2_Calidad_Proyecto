import { Router } from 'express'
import {
  getGremios,
  getGremioById,
  crearGremio,
  unirseGremio,
} from '../controllers/gremios.controller.js'

const router = Router()

router.get('/', getGremios)
router.get('/:id', getGremioById)
router.post('/', crearGremio)
router.post('/unirse', unirseGremio)

export default router
