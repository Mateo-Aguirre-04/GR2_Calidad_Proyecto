import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import {
  getRecordatorios,
  completarRecordatorio,
} from '../controllers/recordatorios.controller.js'

const router = Router()

router.get('/:usuarioId?', real.realOrDemo(real.getRecordatorios, getRecordatorios))
router.post('/:id/completar', real.realOrDemo(real.completarRecordatorio, completarRecordatorio))

export default router
