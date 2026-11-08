import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
const router = Router()

// Los recordatorios se calculan exclusivamente con datos reales de la sesión y la base.
router.get('/', real.getRecordatorios)

export default router
