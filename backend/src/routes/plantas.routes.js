import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'

const router = Router()

router.get('/', real.getPlantas)
router.get('/:id', real.getPlanta)

export default router
