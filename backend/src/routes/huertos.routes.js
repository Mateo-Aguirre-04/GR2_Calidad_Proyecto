import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import {
  getHuerto,
  sembrarCultivo,
  cosecharCultivo,
} from '../controllers/huertos.controller.js'

const router = Router()

router.get('/:id', real.realOrDemo(real.getHuerto, getHuerto))
router.post('/:id/sembrar', real.realOrDemo(real.sembrar, sembrarCultivo))
router.post('/:id/cosechar', real.realOrDemo(real.cosechar, cosecharCultivo))
router.post('/:id/eventos', real.registrarEventoHuerto)

export default router
