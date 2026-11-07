import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { getPlantas, getPlantaById } from '../controllers/plantas.controller.js'

const router = Router()

router.get('/', real.realOrDemo(real.getPlantas, getPlantas))
router.get('/:id', real.realOrDemo(real.getPlanta, getPlantaById))

export default router
