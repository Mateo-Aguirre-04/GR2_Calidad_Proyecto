import { Router } from 'express'
import {
  getRecordatorios,
  completarRecordatorio,
} from '../controllers/recordatorios.controller.js'

const router = Router()

router.get('/:usuarioId?', getRecordatorios)
router.post('/:id/completar', completarRecordatorio)

export default router
